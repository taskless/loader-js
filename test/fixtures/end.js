// a file that exits on load, used for testing the autoloader
import { exit } from "node:process";

console.log("Fixture with no calls by default");

// if nothing tells this to exit, it runs forever
exit(0);
