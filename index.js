import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

// import { Pool } from 'pg';

const app = express();
app.use(express.json());

const itemsPool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "1234567",
  port: 5432,
});

app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function checkVisited() {
  try {
    const result = await itemsPool.query(
      "SELECT country_code FROM visited_countries WHERE user_id = $1",
      [currentUserId]
    );
    return result.rows.map(row => row.country_code);
  } catch (error) {
    console.log(error);
    return [];
  }
}

async function getCurrentUser() {
  try {
    const result = await itemsPool.query("SELECT * FROM users");
    users = result.rows;
    return users.find((user) => user.id == currentUserId);
  } catch (error) {
    console.log(error);
    return null;
  }
}

app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    res.status(404).send("User not found");
    return;
  }

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});


app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();

  try {
    const result = await itemsPool.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%'",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    let countryCode = data.country_code;

    if (countryCode === "IO") {
      countryCode = "IN";
    }

    try {
      await itemsPool.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
      res.status(500).send("Error adding country to visited list");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error finding country");
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  try {
    const result = await itemsPool.query(
      "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *",
      [name, color]
    );

    const id = result.rows[0].id;
    currentUserId = id;

    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error adding new user");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
