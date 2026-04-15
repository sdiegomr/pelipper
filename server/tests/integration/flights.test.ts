// server/tests/integration/flights.test.ts
/**
 * Flights route integration tests.
 * Amadeus SDK calls are mocked — no real network calls.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';

const { testDb, dbMock } = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  const mock = {
    db,
    closeDb: () => {},
    reinitialize: () => {},
    getPlaceWithTags: (placeId: number) => {
      const place: any = db.prepare(`SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon FROM places p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`).get(placeId);
      if (!place) return null;
      const tags = db.prepare(`SELECT t.* FROM tags t JOIN place_tags pt ON t.id = pt.tag_id WHERE pt.place_id = ?`).all(placeId);
      return { ...place, category: place.category_id ? { id: place.category_id, name: place.category_name, color: place.category_color, icon: place.category_icon } : null, tags };
    },
    canAccessTrip: (tripId: any, userId: number) =>
      db.prepare(`SELECT t.id, t.user_id FROM trips t LEFT JOIN trip_members m ON m.trip_id = t.id AND m.user_id = ? WHERE t.id = ? AND (t.user_id = ? OR m.user_id IS NOT NULL)`).get(userId, tripId, userId),
    isOwner: (tripId: any, userId: number) =>
      !!db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').get(tripId, userId),
  };
  return { testDb: db, dbMock: mock };
});

vi.mock('../../src/db/database', () => dbMock);
vi.mock('../../src/config', () => ({
  JWT_SECRET: 'test-jwt-secret-for-trek-testing-only',
  ENCRYPTION_KEY: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2',
  updateJwtSecret: () => {},
}));

// Mock amadeus service — no real HTTP calls
vi.mock('../../src/services/amadeusService', () => ({
  searchAirports: vi.fn().mockResolvedValue([
    { iataCode: 'CDG', name: 'Charles de Gaulle', cityName: 'Paris', countryCode: 'FR' },
    { iataCode: 'ORY', name: 'Orly', cityName: 'Paris', countryCode: 'FR' },
  ]),
  searchFlights: vi.fn().mockResolvedValue([
    {
      id: 'offer-1',
      price: { total: '350.00', currency: 'EUR' },
      itineraries: [{
        duration: 'PT8H30M',
        segments: [{
          departure: { iataCode: 'CDG', at: '2026-05-10T08:00:00' },
          arrival: { iataCode: 'JFK', at: '2026-05-10T11:30:00' },
          carrierCode: 'AF',
          number: '006',
        }],
      }],
    },
  ]),
}));

import { createApp } from '../../src/app';
import { createTables } from '../../src/db/schema';
import { runMigrations } from '../../src/db/migrations';
import { resetTestDb } from '../helpers/test-db';
import { createUser } from '../helpers/factories';
import { authCookie } from '../helpers/auth';
import { loginAttempts, mfaAttempts } from '../../src/routes/auth';

const app: Application = createApp();

beforeAll(() => {
  createTables(testDb);
  runMigrations(testDb);
});

beforeEach(() => {
  resetTestDb(testDb);
  loginAttempts.clear();
  mfaAttempts.clear();
});

afterAll(() => testDb.close());

describe('GET /api/flights/airports', () => {
  it('FLIGHTS-001 — returns 401 without auth', async () => {
    const res = await request(app).get('/api/flights/airports?query=paris');
    expect(res.status).toBe(401);
  });

  it('FLIGHTS-002 — returns 400 when query is missing', async () => {
    const { user } = createUser(testDb);
    const res = await request(app)
      .get('/api/flights/airports')
      .set('Cookie', authCookie(user.id));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/2 characters/);
  });

  it('FLIGHTS-003 — returns 400 when query is 1 char', async () => {
    const { user } = createUser(testDb);
    const res = await request(app)
      .get('/api/flights/airports?query=p')
      .set('Cookie', authCookie(user.id));
    expect(res.status).toBe(400);
  });

  it('FLIGHTS-004 — returns airport list for valid query', async () => {
    const { user } = createUser(testDb);
    const res = await request(app)
      .get('/api/flights/airports?query=paris')
      .set('Cookie', authCookie(user.id));
    expect(res.status).toBe(200);
    expect(res.body.airports).toHaveLength(2);
    expect(res.body.airports[0]).toMatchObject({ iataCode: 'CDG', cityName: 'Paris' });
  });
});

describe('POST /api/flights/search', () => {
  it('FLIGHTS-005 — returns 401 without auth', async () => {
    const res = await request(app).post('/api/flights/search').send({});
    expect(res.status).toBe(401);
  });

  it('FLIGHTS-006 — returns 400 when required fields are missing', async () => {
    const { user } = createUser(testDb);
    const res = await request(app)
      .post('/api/flights/search')
      .set('Cookie', authCookie(user.id))
      .send({ originLocationCode: 'CDG' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/);
  });

  it('FLIGHTS-007 — returns 400 when adults is 0', async () => {
    const { user } = createUser(testDb);
    const res = await request(app)
      .post('/api/flights/search')
      .set('Cookie', authCookie(user.id))
      .send({ originLocationCode: 'CDG', destinationLocationCode: 'JFK', departureDate: '2026-05-10', adults: 0 });
    expect(res.status).toBe(400);
  });

  it('FLIGHTS-008 — returns flight offers for valid search', async () => {
    const { user } = createUser(testDb);
    const res = await request(app)
      .post('/api/flights/search')
      .set('Cookie', authCookie(user.id))
      .send({ originLocationCode: 'CDG', destinationLocationCode: 'JFK', departureDate: '2026-05-10', adults: 1 });
    expect(res.status).toBe(200);
    expect(res.body.offers).toHaveLength(1);
    expect(res.body.offers[0].price.total).toBe('350.00');
  });
});

describe('GET /api/flights/preferences', () => {
  it('FLIGHTS-009 — returns 401 without auth', async () => {
    const res = await request(app).get('/api/flights/preferences');
    expect(res.status).toBe(401);
  });

  it('FLIGHTS-010 — returns defaults when no preferences saved', async () => {
    const { user } = createUser(testDb);
    const res = await request(app)
      .get('/api/flights/preferences')
      .set('Cookie', authCookie(user.id));
    expect(res.status).toBe(200);
    expect(res.body.preferences).toMatchObject({
      cabin_class: 'ECONOMY',
      max_stops: 2,
      preferred_airlines: [],
    });
  });

  it('FLIGHTS-011 — returns saved preferences after PUT', async () => {
    const { user } = createUser(testDb);
    await request(app)
      .put('/api/flights/preferences')
      .set('Cookie', authCookie(user.id))
      .send({ cabin_class: 'BUSINESS', max_stops: 0, preferred_airlines: ['AF', 'LH'] });

    const res = await request(app)
      .get('/api/flights/preferences')
      .set('Cookie', authCookie(user.id));
    expect(res.status).toBe(200);
    expect(res.body.preferences).toMatchObject({
      cabin_class: 'BUSINESS',
      max_stops: 0,
      preferred_airlines: ['AF', 'LH'],
    });
  });
});

describe('PUT /api/flights/preferences', () => {
  it('FLIGHTS-012 — returns 401 without auth', async () => {
    const res = await request(app).put('/api/flights/preferences').send({});
    expect(res.status).toBe(401);
  });

  it('FLIGHTS-013 — returns 400 for invalid cabin_class', async () => {
    const { user } = createUser(testDb);
    const res = await request(app)
      .put('/api/flights/preferences')
      .set('Cookie', authCookie(user.id))
      .send({ cabin_class: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cabin_class/);
  });

  it('FLIGHTS-014 — returns 400 for max_stops > 2', async () => {
    const { user } = createUser(testDb);
    const res = await request(app)
      .put('/api/flights/preferences')
      .set('Cookie', authCookie(user.id))
      .send({ max_stops: 5 });
    expect(res.status).toBe(400);
  });

  it('FLIGHTS-015 — saves preferences and returns success', async () => {
    const { user } = createUser(testDb);
    const res = await request(app)
      .put('/api/flights/preferences')
      .set('Cookie', authCookie(user.id))
      .send({ cabin_class: 'ECONOMY', max_stops: 1, preferred_airlines: [] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('FLIGHTS-016 — upserts on second call (no duplicate error)', async () => {
    const { user } = createUser(testDb);
    await request(app)
      .put('/api/flights/preferences')
      .set('Cookie', authCookie(user.id))
      .send({ cabin_class: 'ECONOMY', max_stops: 1 });
    const res = await request(app)
      .put('/api/flights/preferences')
      .set('Cookie', authCookie(user.id))
      .send({ cabin_class: 'BUSINESS', max_stops: 0 });
    expect(res.status).toBe(200);
  });
});
