import server from './server'
import { startReminderScheduler } from './services/reminderScheduler'

const port = process.env.PORT || 3000

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
    startReminderScheduler()
})

export default server;