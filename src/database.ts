import pg from "pg";

const pool = new pg.Pool({
    user: "postgres",
    host: "localhost",
    database: "supdesk",
    password: "Will_471!",
    port: 5432,
});

export default pool;