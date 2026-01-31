import { Redis } from '@upstash/redis'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Carrega variáveis de ambiente
dotenv.config({ path: '.env.local' })
dotenv.config()

const redis = Redis.fromEnv()
const prisma = new PrismaClient()

async function migrate() {
  console.log('🚀 Iniciando migração do Redis para Neon (PostgreSQL)...')

  try {
    // 1. Encontrar todos os usuários
    // Vamos buscar pelas chaves de perfil que indicam usuários ativos
    const profileKeys = await redis.keys('perfil_*')
    const usernames = profileKeys.map(key => key.replace('perfil_', ''))

    console.log(`👥 Encontrados ${usernames.length} usuários para migrar.`)

    for (const username of usernames) {
      console.log(`\nProcessando usuário: ${username}...`)

      // --- 1. Criar/Atualizar Usuário ---
      const perfilData: any = await redis.get(`perfil_${username}`)
      
      // Tenta buscar autenticação para senha (opcional, foco no User profile)
      // const authData: any = await redis.get(`user:${username}:auth`)

      const config = perfilData?.config || {}
      
      // Cria usuário no PostgreSQL
      const user = await prisma.user.upsert({
        where: { username },
        update: {
            // Se já existe, atualiza configurações
            waterGoal: Number(config.waterMeta) || 3000,
        },
        create: {
          username,
          name: username, // Usando username como nome por enquanto
          waterGoal: Number(config.waterMeta) || 3000,
          targetDays: 5 // Valor padrão
        }
      })
      console.log(`✅ Usuário ${username} sincronizado (ID: ${user.id})`)

      // --- 2. Processar Plano de Treino (120 dias) e Logs Diários ---
      const planoKey = `plano_120_dias_${username}`
      const plano: any = await redis.get(planoKey)
      
      // Busca dia atual para calcular datas retroativas
      const diaAtualStr = await redis.get(`dia_atual_treino_${username}`) as string | number | null
      const diaAtual = diaAtualStr ? Number(diaAtualStr) : 1
      
      // Data de referência de HOJE, zerada as horas
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (plano) {
        // Itera sobre as modalidades (musculação, cardio, etc)
        const modalidades = Object.keys(plano)
        
        // Precisamos iterar por dias (1 a 120) para consolidar logs
        // O plano está estruturado como: { "Musculacao": [ { dia: 1, exercicios: [] }, ... ] }
        // Vamos inverter para iterar por dia
        
        // Assumindo que todas as modalidades têm a mesma quantidade de dias e índices alinhados
        // Vamos pegar o tamanho do array da primeira modalidade
        const totalDias = plano[modalidades[0]]?.length || 0

        for (let i = 0; i < totalDias; i++) {
            const diaIndex = i + 1 // Dia 1, Dia 2...
            
            // Pular dias futuros?
            // O usuário pode ter preenchido algo no futuro? Improvável, mas o script deve lidar.
            // Regra: Se o diaIndex > diaAtual, assumimos data futura a partir de hoje.
            // Se diaIndex <= diaAtual, é passado.
            
            // Exemplo: DiaAtual = 10. 
            // i=9 (Dia 10) -> Date = Hoje
            // i=0 (Dia 1) -> Date = Hoje - 9 dias
            
            const diffDays = diaIndex - diaAtual
            const logDate = new Date(today)
            logDate.setDate(logDate.getDate() + diffDays)
            
            // --- 3. Consolidar Dados de Check-in (Água, Sono, Checklist) ---
            // Chaves: agua_u{user}_d{dia}, sono_u{user}_d{dia}
            const aguaKey = `agua_u${username}_d${diaIndex}`
            const sonoKey = `sono_u${username}_d${diaIndex}`
            // Nota: No código original não vi chave explícita para checklist (legumes), 
            // mas o schema pede. Se não tem no Redis, fica false.
            // O código original tinha 'relat_...' para relatório.

            const [aguaData, sonoData] = await Promise.all([
                redis.get(aguaKey),
                redis.get(sonoKey)
            ])

            // Parse Água
            let waterMl = 0
            if (Array.isArray(aguaData)) {
                waterMl = aguaData.reduce((acc: number, item: any) => acc + (item.vol || 0), 0)
            }
            
            // Parse Sono
            let sleepHours = 0
            if (sonoData) {
                sleepHours = Number(sonoData) || 0
            }

            // Criar/Atualizar DailyLog
            // Apenas criamos se houver algum dado relevante (água, sono ou treino realizado)
            // Mas vamos verificar os treinos primeiro
            
            let hasWorkout = false
            const workoutLogsToCreate = []

            for (const mod of modalidades) {
                const diaData = plano[mod][i]
                if (diaData && diaData.exercicios) {
                    for (const ex of diaData.exercicios) {
                        // Verifica se houve realização significativa
                        // No código original: ex.concluido = true
                        if (ex.concluido || (ex.realizado && ex.realizado > 0)) {
                            hasWorkout = true
                            workoutLogsToCreate.push({
                                userId: user.id,
                                date: logDate,
                                modalidade: mod,
                                exercise: ex.name,
                                target: Number(ex.meta) || 0,
                                performed: Number(ex.realizado) || 0,
                                unit: ex.unit || '',
                                points: 0 // Cálculo de pontos não estava claro no histórico, deixamos 0 ou calculamos depois
                            })
                        }
                    }
                }
            }

            // Se tem dados de água, sono ou treino, salva o DailyLog
            if (waterMl > 0 || sleepHours > 0 || hasWorkout) {
                const dailyLog = await prisma.dailyLog.upsert({
                    where: {
                        userId_date: {
                            userId: user.id,
                            date: logDate
                        }
                    },
                    update: {
                        waterMl,
                        sleepHours
                    },
                    create: {
                        userId: user.id,
                        date: logDate,
                        waterMl,
                        sleepHours,
                        ateVeggies: false, // Default
                        ateProtein: false, // Default
                        calorieAbuse: false, // Default
                        usedApp: true // Se tem log, usou
                    }
                })

                // Salva Workouts
                if (workoutLogsToCreate.length > 0) {
                    // Limpa logs de treino anteriores desse dia para evitar duplicatas na migração (opcional, mas seguro)
                    // Na verdade, workoutLog não tem unique constraint forte além do ID, então melhor deletar por dia/user antes de inserir
                    // ou apenas inserir. Vamos assumir append para simplificar, mas idealmente seria sync.
                    // Para evitar complexidade, vamos só criar.
                    
                    // Como o script pode ser rodado várias vezes, vamos deletar logs desse dia/user antes de recriar
                    const startOfDay = new Date(logDate); startOfDay.setHours(0,0,0,0);
                    const endOfDay = new Date(logDate); endOfDay.setHours(23,59,59,999);

                    await prisma.workoutLog.deleteMany({
                        where: {
                            userId: user.id,
                            date: {
                                gte: startOfDay,
                                lte: endOfDay
                            }
                        }
                    })

                    await prisma.workoutLog.createMany({
                        data: workoutLogsToCreate
                    })
                }
                
                // Log visual apenas para dias com dados
                process.stdout.write('.')
            }
        }
        console.log(`\n   -> Plano de 120 dias processado para ${username}.`)
      } else {
        console.log(`   -> Nenhum plano encontrado para ${username}.`)
      }
    }

    console.log('\n\n✅ Migração concluída com sucesso!')

  } catch (error) {
    console.error('\n❌ Erro fatal durante a migração:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
