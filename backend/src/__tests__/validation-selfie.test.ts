import { validateSelfieConfirm, validateSelfiePresign } from '../validation/validation-selfie.js';

describe('validation-selfie', () => {
  it('validates selfie presign payload', () => {
    const result = validateSelfiePresign({
      userId: 'user_1',
      eventId: 'event_1',
      contentType: 'image/jpeg',
      ignored: 'value'
    });

    expect(result.value).toEqual({
      userId: 'user_1',
      eventId: 'event_1',
      contentType: 'image/jpeg'
    });
  });

  it('throws validation error for invalid selfie confirm payload', () => {
    expect(() =>
      validateSelfieConfirm({
        userId: 'user_1',
        eventId: 'event_1',
        bucket: ''
      })
    ).toThrow('Invalid selfie confirm payload');
  });
});
