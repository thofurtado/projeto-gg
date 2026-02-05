
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const username = "thofurtado"

    // 1. Find User
    let user = await prisma.user.findUnique({
        where: { username }
    })

    if (!user) {
        console.log(`Creating user ${username}...`)
        user = await prisma.user.create({
            data: { username }
        })
    }

    // 2. Find or Create Team
    const teamName = "Alpha Squad"
    let team = await prisma.team.findFirst({
        where: { name: teamName }
    })

    if (!team) {
        console.log(`Creating team ${teamName}...`)
        team = await prisma.team.create({
            data: {
                name: teamName,
                color: "#CCFF00",
                leaderId: user.id
            }
        })
    }

    // 3. Assign User to Team
    console.log(`Assigning ${username} to team ${teamName}...`)
    await prisma.user.update({
        where: { id: user.id },
        data: { teamId: team.id }
    })

    // 4. Update Team Leader just in case
    if (!team.leaderId) {
        await prisma.team.update({
            where: { id: team.id },
            data: { leaderId: user.id }
        })
    }

    console.log("Seed completed successfully!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
