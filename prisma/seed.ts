import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

// Dica: Se o VS Code reclamar do 'Role', é só rodar o 'npx prisma generate' que ele para.
// Estamos acessando o Enum Role direto do client gerado.
// Se ainda der erro de import, usaremos strings literais como fallback, mas o ideal é o Enum.
const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // Hashes das senhas (Custo 10)
    const passwordThomas = await hash('91827', 10)
    const passwordYamiel = await hash('59182', 10)
    const passwordLucas = await hash('29183', 10)
    const passwordJulio = await hash('93812', 10)
    const passwordThiago = await hash('18293', 10)
    const passwordAna = await hash('56192', 10)

    // Definimos os usuários. Note que usamos "as const" ou strings diretas
    // caso o Enum Role ainda não esteja sendo reconhecido pelo editor.
    const users = [
        { username: 'thomas', password: passwordThomas, role: 'ADMIN' },
        { username: 'yamiel', password: passwordYamiel, role: 'ADMIN' },
        { username: 'lucas', password: passwordLucas, role: 'GUIDE' },
        { username: 'julio', password: passwordJulio, role: 'GUIDE' },
        { username: 'thiago', password: passwordThiago, role: 'GUIDE' },
        { username: 'ana', password: passwordAna, role: 'GUIDE' },
    ]

    for (const u of users) {
        // Precisamos garantir que o TypeScript entenda que 'role' é do tipo Role
        // O "as any" aqui é um "truque" temporário para forçar o seed a rodar 
        // mesmo se o editor estiver confuso com a tipagem antiga.
        await prisma.user.upsert({
            where: { username: u.username },
            update: {
                role: u.role as any,
                password: u.password
            },
            create: {
                username: u.username,
                password: u.password,
                role: u.role as any,
                targetDays: 5,
                waterGoal: 3000
            }
        })
        console.log(`User ${u.username} seeded/updated with secure password.`)
    }

    console.log('Seeding complete.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })