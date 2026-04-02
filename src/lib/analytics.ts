type AnalyticsEventName =
  | "landing_page_view"
  | "landing_cta_start_free_click"
  | "landing_cta_login_click"
  | "signup_started"
  | "signup_success"
  | "login_success"
  | "forgot_password_request_sent"
  | "email_confirmation_success"
  | "reset_password_success";

type AnalyticsEventProps = Record<string, string | number | boolean | null | undefined>;

interface AnalyticsProvider {
  track: (event: AnalyticsEventName, properties?: AnalyticsEventProps) => void;
}

class ConsoleAnalyticsProvider implements AnalyticsProvider {
  track(event: AnalyticsEventName, properties?: AnalyticsEventProps) {
    if (!import.meta.env.DEV) return;
    console.debug("[analytics]", event, properties ?? {});
  }
}

const provider: AnalyticsProvider = new ConsoleAnalyticsProvider();

const sessionEventKey = (event: AnalyticsEventName, key: string) => `analytics:${event}:${key}`;

export const analytics = {
  track(event: AnalyticsEventName, properties?: AnalyticsEventProps) {
    provider.track(event, properties);
  },

  trackOncePerSession(event: AnalyticsEventName, uniqueKey: string, properties?: AnalyticsEventProps) {
    const storageKey = sessionEventKey(event, uniqueKey);
    if (sessionStorage.getItem(storageKey)) return;

    provider.track(event, properties);
    sessionStorage.setItem(storageKey, "1");
  },
};

export type { AnalyticsEventName, AnalyticsEventProps };
