import 'dotenv/config'
import app from "./src/app.js";
import { apiConfig } from "./src/config/env.js";
import { connectDatabase } from './src/config/database.js';




connectDatabase()
app.listen(apiConfig.PORT, () => {
    console.log(`server is listening in port ${apiConfig.PORT}`)
})