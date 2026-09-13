const { app } = require("./app");
const port = Number(process.env.PORT || 3003);
app.listen(port, "0.0.0.0", () => console.log(`order-service listening on ${port}`));
