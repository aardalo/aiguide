/**
 * Neo4j driver singleton.
 * Location: src/lib/neo4j.ts
 *
 * Server-side only. Connects to the Neo4j instance defined by NEO4J_* env vars.
 * Returns null if the connection cannot be established so callers can degrade gracefully.
 */

import neo4j, { type Driver, type Session } from 'neo4j-driver';

let _driver: Driver | null = null;
let _initAttempted = false;

function getDriver(): Driver | null {
  if (_initAttempted) return _driver;
  _initAttempted = true;

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    console.warn('[neo4j] NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD not set — graph cache disabled');
    return null;
  }

  try {
    _driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 5,
      connectionAcquisitionTimeout: 3000,
    });
    return _driver;
  } catch (err) {
    console.warn('[neo4j] Failed to create driver:', err);
    return null;
  }
}

/**
 * Open a Neo4j session. Returns null if Neo4j is unavailable.
 * Caller is responsible for closing the session.
 */
export async function openSession(): Promise<Session | null> {
  const driver = getDriver();
  if (!driver) return null;

  try {
    // Verify connectivity with a short timeout
    await driver.verifyConnectivity({ database: 'neo4j' });
    return driver.session({ database: 'neo4j' });
  } catch (err) {
    console.warn('[neo4j] Not reachable — graph cache disabled for this request');
    return null;
  }
}

/**
 * Ensure the schema constraints exist. Safe to call multiple times (idempotent).
 * Called once on first geocode request.
 */
export async function ensureConstraints(): Promise<void> {
  const session = await openSession();
  if (!session) return;

  try {
    await session.run(
      'CREATE CONSTRAINT place_id_unique IF NOT EXISTS FOR (p:Place) REQUIRE p.placeId IS UNIQUE',
    );
    await session.run(
      'CREATE CONSTRAINT geo_search_key_unique IF NOT EXISTS FOR (g:GeoSearch) REQUIRE g.queryKey IS UNIQUE',
    );
  } catch (err) {
    console.warn('[neo4j] Could not create constraints:', err);
  } finally {
    await session.close();
  }
}
