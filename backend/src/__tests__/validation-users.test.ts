import { validateRegisterGuest } from '../validation/validation-users.js';

describe('validation-users', () => {
  it('validates guest registration payload', () => {
    const result = validateRegisterGuest({
      eventId: 'event_1',
      fullName: 'Jane Doe',
      phone: '+1 555 010 9999',
      side: 'BRIDE',
      relation: 'Bride\'s Cousin',
      ignored: 'value'
    });

    expect(result.value).toEqual({
      eventId: 'event_1',
      fullName: 'Jane Doe',
      phone: '+1 555 010 9999',
      side: 'BRIDE',
      relation: 'Bride\'s Cousin'
    });
  });

  it('throws validation error when phone is missing', () => {
    expect(() =>
      validateRegisterGuest({
        eventId: 'event_1',
        fullName: 'Jane Doe'
      })
    ).toThrow('Invalid guest registration payload');
  });
});
