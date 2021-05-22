const { response } = require("express");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const app = express();

//configs
app.use(express.json());

//db
const customers = [];

function verify_if_exists_account_cpf(req, res, next) {
  const { cpf } = req.headers;
  const customer = customers.find((customer) => customer.cpf == cpf);
  if (!customer) {
    return res.status(400).send({ message: "usuário não existe" });
  }
  req.customer = customer;
  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type == "credit") {
      return acc + operation.amount;
    } else if (operation.type == "debit") {
      return acc - operation.amount;
    }
  }, 0);
  return balance;
}

app.post("/account", (req, res) => {
  const { cpf, name } = req.body;

  const customer_already_exists = customers.some(
    (customer) => customer.cpf == cpf
  );
  if (customer_already_exists) {
    return res.status(400).send({ message: "customer already exists" });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  });
  return res.status(200).send();
});

app.get("/statement", verify_if_exists_account_cpf, (req, res) => {
  const { customer } = req;
  return res.status(200).json(customer.statement);
});

app.post("/deposit", verify_if_exists_account_cpf, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;
  const statement_operation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };
  customer.statement.push(statement_operation);
  return res.status(201).send();
});

app.post("/withdraw", verify_if_exists_account_cpf, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;
  const balance = getBalance(customer.statement);
  if (balance < amount) {
    return res.status(400).json({ error: "sem saldo suficiente" });
  }
  const statement_operation = {
    description,
    amount,
    created_at: new Date(),
    type: "debit",
  };
  customer.statement.push(statement_operation);
  return res.status(201).send();
});

app.get("/statement/date", verify_if_exists_account_cpf, (req, res) => {
  const { customer } = req;
  const { date_initial, date_final } = req.query;
  const date_format_initial = new Date(date_initial + " 00:00");  
  const date_format_final = new Date(date_final + " 23:59");
  const statement = customer.statement.filter(
    (operation) =>
      operation.created_at.toDateString() >=
      new Date(date_format_initial).toDateString() && operation.created_at.toDateString() <
      new Date(date_format_final).toDateString()
  );
  return res.status(201).send(statement);
});

app.put("/account",verify_if_exists_account_cpf,(req,res)=>{
    const {name} = req.body;
    const { customer} = req;
    customer.name = name;
    return res.status(201).send();
});

app.get("/account",verify_if_exists_account_cpf,(req,res)=>{
    const {customer} = req;
    return res.status(200).json(customer);
});

app.delete("/account", verify_if_exists_account_cpf, (req,res)=>{
    const {customer} = req;
    customers=customers.filter(custo=>custo.id!=customer.id);
    return res.status(204).send();
});

app.get("/accounts", (req,res)=>{
    return res.status(200).json(customers);
});

app.get("/balance",verify_if_exists_account_cpf,(req,res)=>{
    const {customer} = req;
    return res.status(200).json(getBalance(customer.statement));
});

app.listen(5000);
