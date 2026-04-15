import express, { Request, Response } from 'express';
import { db } from '../db/database';
import { authenticate } from '../middleware/auth';
import { searchAirports, searchFlights } from '../services/amadeusService';
import { AuthRequest } from '../types';

const router = express.Router();

// GET /api/flights/airports?query=paris
router.get('/airports', authenticate, async (req: Request, res: Response) => {
  const { query } = req.query as { query?: string };
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'query must be at least 2 characters' });
  }
  try {
    const airports = await searchAirports(query.trim());
    res.json({ airports });
  } catch (err) {
    console.error('[flights] airport search error:', err);
    res.status(502).json({ error: 'Airport search failed' });
  }
});

// POST /api/flights/search
router.post('/search', authenticate, async (req: Request, res: Response) => {
  const { originLocationCode, destinationLocationCode, departureDate, returnDate, adults, travelClass, nonStop, currencyCode, max } = req.body;

  if (!originLocationCode || !destinationLocationCode || !departureDate) {
    return res.status(400).json({ error: 'originLocationCode, destinationLocationCode, and departureDate are required' });
  }
  const adultsNum = Number(adults);
  if (!adults || isNaN(adultsNum) || adultsNum < 1) {
    return res.status(400).json({ error: 'adults must be at least 1' });
  }

  try {
    const offers = await searchFlights({
      originLocationCode,
      destinationLocationCode,
      departureDate,
      returnDate: returnDate || undefined,
      adults: adultsNum,
      travelClass: travelClass || undefined,
      nonStop: nonStop !== undefined ? Boolean(nonStop) : undefined,
      currencyCode: currencyCode || 'EUR',
      max: max ? Number(max) : 50,
    });
    res.json({ offers });
  } catch (err) {
    console.error('[flights] search error:', err);
    res.status(502).json({ error: 'Flight search failed' });
  }
});

// GET /api/flights/preferences
router.get('/preferences', authenticate, (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const pref = db.prepare('SELECT * FROM flight_preferences WHERE user_id = ?').get(authReq.user.id) as any;
  if (!pref) {
    return res.json({ preferences: { cabin_class: 'ECONOMY', max_stops: 2, preferred_airlines: [] } });
  }
  res.json({
    preferences: {
      cabin_class: pref.cabin_class,
      max_stops: pref.max_stops,
      preferred_airlines: JSON.parse(pref.preferred_airlines || '[]'),
    },
  });
});

// PUT /api/flights/preferences
router.put('/preferences', authenticate, (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { cabin_class, max_stops, preferred_airlines } = req.body;

  const validCabinClasses = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
  if (cabin_class && !validCabinClasses.includes(cabin_class)) {
    return res.status(400).json({ error: 'Invalid cabin_class' });
  }
  if (max_stops !== undefined && (typeof max_stops !== 'number' || max_stops < 0 || max_stops > 2)) {
    return res.status(400).json({ error: 'max_stops must be 0, 1, or 2' });
  }
  if (preferred_airlines !== undefined && !Array.isArray(preferred_airlines)) {
    return res.status(400).json({ error: 'preferred_airlines must be an array' });
  }

  db.prepare(`
    INSERT INTO flight_preferences (user_id, cabin_class, max_stops, preferred_airlines, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      cabin_class = excluded.cabin_class,
      max_stops = excluded.max_stops,
      preferred_airlines = excluded.preferred_airlines,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    authReq.user.id,
    cabin_class || 'ECONOMY',
    max_stops !== undefined ? max_stops : 2,
    JSON.stringify(preferred_airlines || []),
  );

  res.json({ success: true });
});

export default router;
