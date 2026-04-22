import { seed } from "$hatk";

const { createAccount, createRecord } = seed();

const alice = await createAccount("alice.test");
const bob = await createAccount("bob.test");

console.log("\n[seed] Done!");
