/**
 * Webhook Validator
 * Validates webhook subscription creation/update.
 *
 * The webhooks table has NOT NULL columns url, events and secret_key. Without
 * validation, a POST missing any of these reached the DB and surfaced as a
 * 500 NOT NULL violation (issue #909). This validator turns those into a clean
 * 422 with field-level detail, matching the other CRUD validators.
 */

import { BaseValidator } from "../BaseValidator.ts";
import { ValidationContext, ValidationError } from "../types.ts";

// http(s) URL, since webhooks are delivered over HTTP.
const URL_PATTERN = /^https?:\/\/.+/i;

export interface WebhookData {
  url: string;
  events: string[];
  secret_key: string;
  active?: boolean;
}

export class WebhookValidator extends BaseValidator<WebhookData> {
  constructor() {
    super("webhook");
  }

  validateEntity(
    entity: WebhookData,
    index: number,
    _context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required: url (must be an http(s) URL)
    const urlError = this.validateString(entity, "url", index, {
      required: true,
      minLength: 1,
      maxLength: 2048,
      pattern: URL_PATTERN,
    });
    if (urlError) errors.push(urlError);

    // Required: events (non-empty array)
    const eventsError = this.validateArray(entity, "events", index, {
      required: true,
      minLength: 1,
    });
    if (eventsError) errors.push(eventsError);

    // Required: secret_key (NOT NULL in DB; used to sign webhook payloads)
    const secretError = this.validateString(entity, "secret_key", index, {
      required: true,
      minLength: 1,
    });
    if (secretError) errors.push(secretError);

    return errors;
  }
}
