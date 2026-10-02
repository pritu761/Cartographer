import { run } from "./app";

console.log("Starting sample application...");
run().then((data) => {
  console.log("Finished run:", data);
});
