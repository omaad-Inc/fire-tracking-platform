import { TestBed } from '@angular/core/testing';
import { ErrorHandler } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ERROR_REPORTER, EventsErrorReporter, GlobalErrorHandler } from './error-reporter';

describe('EventsErrorReporter + GlobalErrorHandler (S8 groundwork)', () => {
    let http: HttpTestingController;
    let handler: ErrorHandler;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ERROR_REPORTER, useClass: EventsErrorReporter },
                { provide: ErrorHandler, useClass: GlobalErrorHandler },
            ],
        });
        http = TestBed.inject(HttpTestingController);
        handler = TestBed.inject(ErrorHandler);
        spyOn(console, 'error'); // keep test output clean; the handler must still call it
    });

    afterEach(() => http.verify());

    function expectOneEventPost() {
        const req = http.expectOne(`${environment.apiUrl}/events`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body.event_name).toBe('client_error');
        req.flush({});
        return req.request.body;
    }

    it('posts a bounded client_error event and keeps console output', () => {
        handler.handleError(new Error('boom'));

        const body = expectOneEventPost();
        expect(body.event_properties.message).toBe('boom');
        expect(body.event_properties.stack.length).toBeLessThanOrEqual(1500);
        expect(body.event_properties.url).toBeDefined();
        expect(console.error).toHaveBeenCalled();
    });

    it('dedupes identical messages (one POST, every console.error kept)', () => {
        handler.handleError(new Error('same'));
        expectOneEventPost();

        handler.handleError(new Error('same'));
        http.expectNone(`${environment.apiUrl}/events`);
        expect(console.error).toHaveBeenCalledTimes(2);
    });

    it('stops reporting after 10 distinct errors (storm guard)', () => {
        for (let i = 0; i < 12; i++) handler.handleError(new Error(`e${i}`));
        const reqs = http.match(`${environment.apiUrl}/events`);
        expect(reqs.length).toBe(10);
        reqs.forEach(r => r.flush({}));
    });

    it('truncates oversized messages and stacks to the event budget', () => {
        const err = new Error('x'.repeat(5000));
        err.stack = 'y'.repeat(50000);
        handler.handleError(err);

        const body = expectOneEventPost();
        expect(body.event_properties.message.length).toBe(300);
        expect(body.event_properties.stack.length).toBe(1500);
    });

    it('never throws for non-Error values', () => {
        expect(() => handler.handleError('a plain string')).not.toThrow();
        expectOneEventPost();
        expect(() => handler.handleError(undefined)).not.toThrow();
        const reqs = http.match(`${environment.apiUrl}/events`);
        reqs.forEach(r => r.flush({}));
    });
});
