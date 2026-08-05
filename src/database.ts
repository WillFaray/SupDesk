import pg from "pg";

const pool = new pg.Pool({
    user: "postgres",
    host: "localhost",
    database: "SupDesk",
    password: "Will_471!",
    port: 5432,
});

export default pool;