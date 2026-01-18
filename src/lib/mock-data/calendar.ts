import { supabase } from "@/integrations/supabase/client";
import { MockDataResult, GeneratorContext } from "./types";
import { getRelativeISO } from "./utils";

export async function seedCalendar(ctx: GeneratorContext): Promise<MockDataResult> {
    try {
        if (!ctx.options.includeCalendar) {
            return { success: true };
        }

        const now = ctx.now;
        const currentYear = now.getFullYear();
        const nextYear = currentYear + 1;

        // Dutch holidays relative logic or fixed? Holidays are usually fixed dates.
        // We will keep them fixed but ensure we cover the current relevant range.
        const dutchHolidays = [
            // Current Year
            { date: `${currentYear}-01-01`, day_type: 'holiday', name: 'Nieuwjaarsdag', capacity_multiplier: 0 },
            { date: `${currentYear}-04-18`, day_type: 'holiday', name: 'Goede Vrijdag', capacity_multiplier: 0 },
            { date: `${currentYear}-04-20`, day_type: 'holiday', name: 'Eerste Paasdag', capacity_multiplier: 0 },
            { date: `${currentYear}-04-21`, day_type: 'holiday', name: 'Tweede Paasdag', capacity_multiplier: 0 },
            { date: `${currentYear}-04-27`, day_type: 'holiday', name: 'Koningsdag', capacity_multiplier: 0 },
            { date: `${currentYear}-05-05`, day_type: 'holiday', name: 'Bevrijdingsdag', capacity_multiplier: 0 },
            { date: `${currentYear}-05-29`, day_type: 'holiday', name: 'Hemelvaartsdag', capacity_multiplier: 0 },
            // Example closure bridge day for Ascension
            { date: `${currentYear}-05-30`, day_type: 'closure', name: 'Brugdag Hemelvaart', capacity_multiplier: 0, notes: 'Fabriek gesloten - brugdag' },
            { date: `${currentYear}-06-08`, day_type: 'holiday', name: 'Eerste Pinksterdag', capacity_multiplier: 0 },
            { date: `${currentYear}-06-09`, day_type: 'holiday', name: 'Tweede Pinksterdag', capacity_multiplier: 0 },

            // Christmas / New Year closures
            { date: `${currentYear}-12-24`, day_type: 'half_day', name: 'Kerstavond', capacity_multiplier: 0.5, opening_time: '08:00', closing_time: '12:00', notes: 'Fabriek sluit om 12:00' },
            { date: `${currentYear}-12-25`, day_type: 'holiday', name: 'Eerste Kerstdag', capacity_multiplier: 0 },
            { date: `${currentYear}-12-26`, day_type: 'holiday', name: 'Tweede Kerstdag', capacity_multiplier: 0 },
            { date: `${currentYear}-12-27`, day_type: 'closure', name: 'Kerstvakantie', capacity_multiplier: 0 },
            { date: `${currentYear}-12-28`, day_type: 'closure', name: 'Kerstvakantie', capacity_multiplier: 0 },
            { date: `${currentYear}-12-29`, day_type: 'closure', name: 'Kerstvakantie', capacity_multiplier: 0 },
            { date: `${currentYear}-12-30`, day_type: 'closure', name: 'Kerstvakantie', capacity_multiplier: 0 },
            { date: `${currentYear}-12-31`, day_type: 'half_day', name: 'Oudejaarsdag', capacity_multiplier: 0.5, opening_time: '08:00', closing_time: '12:00' },

            // Next Year
            { date: `${nextYear}-01-01`, day_type: 'holiday', name: 'Nieuwjaarsdag', capacity_multiplier: 0 },
            // Add more next year holidays if needed...
        ];

        // Filter out dates far in the past if we want to keep DB clean, 
        // but for now just inserting them is fine as they are static reference data.

        const calendarEntries = dutchHolidays.map(holiday => ({
            tenant_id: ctx.tenantId,
            date: holiday.date,
            day_type: holiday.day_type,
            name: holiday.name,
            opening_time: (holiday as any).opening_time || null,
            closing_time: (holiday as any).closing_time || null,
            capacity_multiplier: holiday.capacity_multiplier,
            notes: (holiday as any).notes || null,
        }));

        const { error: calendarError } = await supabase
            .from("factory_calendar")
            .upsert(calendarEntries, { onConflict: 'tenant_id,date' });

        if (calendarError) {
            console.warn("Calendar seeding warning:", calendarError);
        } else {
            console.log(`✓ Seeded ${calendarEntries.length} Dutch holidays and factory closures`);
        }

        return { success: true };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
