const express = require("express");

const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const { isValid, parseISO, getYear, getMonth, getDate } = require("date-fns");
const dbPath = path.join(__dirname, "todoApplication.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDbServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
    process.exit(1);
  }
};

initializeDbServer();

function statusCheck(status) {
  // 1 and negative numbers are not prime
  if (
    status === "TO DO" ||
    status === "IN PROGRESS" ||
    status === "DONE" ||
    status === ""
  ) {
    return false;
  } else {
    return true;
  }
}

function priorityCheck(priority) {
  // 1 and negative numbers are not prime
  if (
    priority === "HIGH" ||
    priority === "MEDIUM" ||
    priority === "LOW" ||
    priority === ""
  ) {
    return false;
  } else {
    return true;
  }
}

function categoryCheck(priority) {
  // 1 and negative numbers are not prime
  if (
    priority === "WORK" ||
    priority === "HOME" ||
    priority === "LEARNING" ||
    priority === ""
  ) {
    return false;
  } else {
    return true;
  }
}

function isNotValidDate(day, month) {
  res = day < 32 && day > 0 && month < 13 && month > 0;
  return res;
}

app.get("/todos/", async (request, response) => {
  const {
    status = "",
    priority = "",
    order = "ASC",
    order_by = "id",
    category = "",
    search_q = "",
  } = request.query;

  statusValid = statusCheck(status);
  priorityValid = priorityCheck(priority);
  categoryValid = categoryCheck(category);
  if (statusValid) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (priorityValid) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (categoryValid) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    const getTodosQuery = `SELECT id,todo,priority,
  status,category,due_date AS dueDate 
  FROM 
  todo
  WHERE
     todo LIKE '%${search_q}%' AND
     status LIKE '%${status}%' AND
     priority LIKE '%${priority}%' AND
     category LIKE '%${category}%'
    ORDER BY ${order_by} ${order};`;
    const todosList = await db.all(getTodosQuery);
    response.send(todosList);
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT id,todo,priority,
  status,category,due_date AS dueDate 
  FROM 
  todo
  WHERE
     id=${todoId};`;
  const todosObj = await db.get(getTodoQuery);
  response.send(todosObj);
});

app.get("/agenda/", async (request, response) => {
  let {
    status = "",
    priority = "",
    order = "ASC",
    order_by = "id",
    category = "",
    search_q = "",
    date = "",
  } = request.query;

  const dateArray = date.split("-").map((component) => parseInt(component));
  if (date === "") {
    response.status(400);
    response.send("Invalid Due Date");
  } else if (isNotValidDate(dateArray[2], dateArray[1])) {
    formatDate = format(
      new Date(dateArray[0], dateArray[1] - 1, dateArray[2]),
      "yyyy-MM-dd"
    );
    const dateParam = formatDate;
    const dateval = parseISO(dateParam);
    const isValidDate = isValid(dateval);
    if (isValidDate) {
      const getAgendaQuery = `SELECT id,todo,priority,
  status,category,due_date AS dueDate 
  FROM 
  todo
  WHERE
     todo LIKE '%${search_q}%' AND
     status LIKE '%${status}%' AND
     priority LIKE '%${priority}%' AND
     category LIKE '%${category}%' AND
     due_date LIKE '${formatDate}'
    ORDER BY ${order_by} ${order};`;
      const todosList = await db.all(getAgendaQuery);
      response.send(todosList);
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = todoDetails;
  statusValid = statusCheck(status);
  priorityValid = priorityCheck(priority);
  categoryValid = categoryCheck(category);
  const date = dueDate;
  const dateArray = date.split("-").map((component) => parseInt(component));
  if (date === "") {
    response.status(400);
    response.send("Invalid Due Date");
  } else if (isNotValidDate(dateArray[2], dateArray[1])) {
    formatDate = format(
      new Date(dateArray[0], dateArray[1] - 1, dateArray[2]),
      "yyyy-MM-dd"
    );
    const dateParam = formatDate;
    const dateval = parseISO(dateParam);
    const isValidDate = isValid(dateval);
    if (isValidDate) {
      statusValid = statusCheck(status);
      priorityValid = priorityCheck(priority);
      categoryValid = categoryCheck(category);
      if (statusValid) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else if (priorityValid) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else if (categoryValid) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        const addTodoQuery = `
    INSERT INTO
      todo (id,todo,priority,status,category,due_date )
    VALUES
      (
        ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${formatDate}'
      );`;
        await db.run(addTodoQuery);
        response.send("Todo Successfully Added");
      }
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updatedColumn = "";
  let statusValid = true;
  let priorityValid = true;
  let categoryValid = true;

  switch (true) {
    case requestBody.status !== undefined:
      updatedColumn = "Status";
      statusValid = statusCheck(requestBody.status);
      break;
    case requestBody.priority !== undefined:
      updatedColumn = "Priority";
      priorityValid = priorityCheck(requestBody.priority);
      break;
    case requestBody.todo !== undefined:
      updatedColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updatedColumn = "Category";
      categoryValid = categoryCheck(requestBody.category);
      break;
    case requestBody.dueDate !== undefined:
      updatedColumn = "Due Date";
      break;
  }

  const previousTodoQuery = `SELECT * FROM todo WHERE id=${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    status = previousTodo.status,
    priority = previousTodo.priority,
    todo = previousTodo.todo,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  statusValid = statusCheck(status);
  priorityValid = priorityCheck(priority);
  categoryValid = categoryCheck(category);

  const date = dueDate;
  const dateArray = date.split("-").map((component) => parseInt(component));
  if (date === "") {
    response.status(400);
    response.send("Invalid Due Date");
  } else if (isNotValidDate(dateArray[2], dateArray[1])) {
    formatDate = format(
      new Date(dateArray[0], dateArray[1] - 1, dateArray[2]),
      "yyyy-MM-dd"
    );
    const dateParam = formatDate;
    const dateval = parseISO(dateParam);
    const isValidDate = isValid(dateval);
    if (isValidDate) {
      if (statusValid) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else if (priorityValid) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else if (categoryValid) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        const updateTodoQuery = `UPDATE todo SET
      status='${status}',
      priority='${priority}',
      todo='${todo}',
      category='${category}',
      due_date='${dueDate}'
      `;
        await db.run(updateTodoQuery);
        response.send(`${updatedColumn} Updated`);
      }
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE 
  FROM 
  todo
  WHERE
     id=${todoId};`;
  await db.get(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
