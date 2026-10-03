/** Scenario 1 (auth) + Scenario 10 (public health endpoint). */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { api, bootServer, cleanupAll, expectStatus, signup, uniqueEmail } from "./helpers.mjs";

let server;

after(cleanupAll);

describe("auth + health (KEEPALIVE_MS=0)", () => {
  before(async () => {
    server = await bootServer({ keepaliveMs: 0 });
  });
  after(async () => {
    await server?.close();
  });

  test("S10: GET /api/health is public (no auth) and reports the local provider", async () => {
    const res = await api(server.base, null, "GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.match(String(res.json.provider), /local/i);
    assert.ok(typeof res.json.time === "string");
  });

  test("S1: signup returns a token and the public user shape", async () => {
    const email = uniqueEmail();
    const res = await api(server.base, null, "POST", "/api/auth/signup", {
      email,
      password: "hunter22",
      name: "Grace Hopper",
    });
    assert.equal(res.status, 200);
    assert.ok(typeof res.json.token === "string" && res.json.token.length >= 32, "token is a real bearer token");
    assert.equal(res.json.user.email, email);
    assert.equal(res.json.user.name, "Grace Hopper");
    assert.equal(res.json.user.initials, "G");
    assert.ok(res.json.user.id);
  });

  test("S1: signup without a name defaults the display name to the email local-part", async () => {
    const email = uniqueEmail();
    const res = await api(server.base, null, "POST", "/api/auth/signup", { email, password: "hunter22" });
    assert.equal(res.status, 200);
    assert.equal(res.json.user.name, email.split("@")[0]);
    assert.equal(res.json.user.initials, email[0].toUpperCase());
  });

  test("S1: duplicate email (any casing) is rejected with 409", async () => {
    const email = uniqueEmail();
    await api(server.base, null, "POST", "/api/auth/signup", { email, password: "hunter22" });
    const sameCase = await api(server.base, null, "POST", "/api/auth/signup", { email, password: "other-pass" });
    assert.equal(sameCase.status, 409);
    const otherCase = await api(server.base, null, "POST", "/api/auth/signup", {
      email: email.toUpperCase(),
      password: "other-pass",
    });
    assert.equal(otherCase.status, 409);
  });

  test("S1: invalid signup payloads are rejected with 400", async () => {
    for (const body of [
      { email: "not-an-email", password: "hunter22" },
      { email: uniqueEmail(), password: "12345" }, // min 6 chars
      { email: uniqueEmail() }, // missing password
      { password: "hunter22" }, // missing email
    ]) {
      const res = await api(server.base, null, "POST", "/api/auth/signup", body);
      assert.equal(res.status, 400, `payload ${JSON.stringify(body)} should be 400`);
    }
  });

  test("S1: login returns a working token; the token authenticates /api/sessions", async () => {
    const email = uniqueEmail();
    await api(server.base, null, "POST", "/api/auth/signup", { email, password: "hunter22", name: "Mel" });
    const res = await api(server.base, null, "POST", "/api/auth/login", { email, password: "hunter22" });
    assert.equal(res.status, 200);
    assert.ok(res.json.token);
    assert.equal(res.json.user.email, email);
    const list = await api(server.base, res.json.token, "GET", "/api/sessions");
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.json));
  });

  test("S1: wrong password and unknown email both answer 401", async () => {
    const email = uniqueEmail();
    await api(server.base, null, "POST", "/api/auth/signup", { email, password: "hunter22" });
    const wrong = await api(server.base, null, "POST", "/api/auth/login", { email, password: "wrong-pass" });
    assert.equal(wrong.status, 401);
    const unknown = await api(server.base, null, "POST", "/api/auth/login", {
      email: uniqueEmail(),
      password: "hunter22",
    });
    assert.equal(unknown.status, 401);
  });

  test("S1: protected routes reject missing and garbage tokens with 401", async () => {
    const cases = [
      ["GET", "/api/sessions"],
      ["POST", "/api/sessions"],
      ["GET", "/api/sessions/s_unknown"],
      ["POST", "/api/sessions/s_unknown/messages"],
    ];
    for (const [method, path] of cases) {
      const noToken = await api(server.base, null, method, path, method === "POST" ? {} : undefined);
      assert.equal(noToken.status, 401, `${method} ${path} without token`);
      const badToken = await api(server.base, "not-a-real-token", method, path, method === "POST" ? {} : undefined);
      assert.equal(badToken.status, 401, `${method} ${path} with garbage token`);
    }
  });

  test("S1: signup response token works immediately (round-trip)", async () => {
    const user = await signup(server.base, { name: "Round Trip" });
    expectStatus(
      await api(server.base, user.token, "GET", "/api/sessions"),
      200,
      "fresh signup token lists sessions",
    );
  });
});
