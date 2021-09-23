const express = require("express");
var cors = require("cors");
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static("saved-data"));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
