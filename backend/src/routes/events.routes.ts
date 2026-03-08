import { Router } from 'express';
import { createEventController, getEventController, listEventVideoStatusesController } from '../controllers/events.controller.js';
import { listEventGuestsController, sendGuestWhatsAppLinkController } from '../controllers/users.controller.js';
import { validateCreateEvent } from '../validation/validation-events.js';
import { validateEventId, validateSendGuestWhatsApp } from '../validation/validation-event-guests.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { value } = validateCreateEvent(req.body);
    const result = await createEventController(value);

    return res.status(201).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:eventId', async (req, res, next) => {
  try {
    const result = await getEventController(req.params.eventId);

    return res.status(200).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:eventId/guests', async (req, res, next) => {
  try {
    const { value } = validateEventId({ eventId: req.params.eventId });
    const result = await listEventGuestsController(value.eventId);

    return res.status(200).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:eventId/videos/status', async (req, res, next) => {
  try {
    const { value } = validateEventId({ eventId: req.params.eventId });
    const result = await listEventVideoStatusesController(value.eventId);

    return res.status(200).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:eventId/guests/:userId/whatsapp-link', async (req, res, next) => {
  try {
    const { value } = validateSendGuestWhatsApp({
      eventId: req.params.eventId,
      userId: req.params.userId
    });
    const result = await sendGuestWhatsAppLinkController(value);

    return res.status(202).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
