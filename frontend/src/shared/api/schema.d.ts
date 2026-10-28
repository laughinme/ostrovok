export interface paths {
  "/health": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["health_health_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/health": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["health_api_health_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/ready": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["ready_api_ready_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/register": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["register_api_v1_auth_register_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/login": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["login_api_v1_auth_login_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/personas": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["personas_api_v1_auth_personas_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/demo": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["demo_login_api_v1_auth_demo_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/refresh": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["refresh_api_v1_auth_refresh_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/logout": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["logout_api_v1_auth_logout_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/logout-all": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["logout_all_api_v1_auth_logout_all_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_me_api_v1_me_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/partner/hotels/{hotel_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_hotel_api_v1_partner_hotels__hotel_id__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/partner/hotels/{hotel_id}/questions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_questions_api_v1_partner_hotels__hotel_id__questions_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/partner/questions/{question_id}/answers": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["post_answer_api_v1_partner_questions__question_id__answers_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/partner/hotels/{hotel_id}/facades": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put: operations["put_facades_api_v1_partner_hotels__hotel_id__facades_put"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/partner/facts/{fact_id}/confirm": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["confirm_fact_api_v1_partner_facts__fact_id__confirm_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/partner/facts/{fact_id}/correct": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["correct_fact_api_v1_partner_facts__fact_id__correct_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/partner/hotels/{hotel_id}/requests": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_requests_api_v1_partner_hotels__hotel_id__requests_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/partner/requests/{booking_id}/decision": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["decide_request_api_v1_partner_requests__booking_id__decision_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/partner/hotels/{hotel_id}/demand": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_demand_api_v1_partner_hotels__hotel_id__demand_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/partner/hotels/{hotel_id}/notifications": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_notifications_api_v1_partner_hotels__hotel_id__notifications_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/bookings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["create_booking_api_v1_bookings_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/trips/{booking_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_trip_api_v1_trips__booking_id__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/trips/{booking_id}/feedback": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["post_feedback_api_v1_trips__booking_id__feedback_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/notifications": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["notifications_api_v1_me_notifications_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/taste": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_taste_api_v1_me_taste_get"];
    put?: never;
    post?: never;
    delete: operations["reset_taste_api_v1_me_taste_delete"];
    options?: never;
    head?: never;
    patch: operations["patch_taste_api_v1_me_taste_patch"];
    trace?: never;
  };
  "/api/v1/hotels/{hotel_id}/window": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["hotel_window_api_v1_hotels__hotel_id__window_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/hotels": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["list_hotels_api_v1_hotels_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/hotels/{hotel_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_hotel_api_v1_hotels__hotel_id__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/hotels/{hotel_id}/facts": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["hotel_facts_api_v1_hotels__hotel_id__facts_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/facts/{fact_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["fact_detail_api_v1_facts__fact_id__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/hotels/{hotel_id}/noise": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["hotel_noise_api_v1_hotels__hotel_id__noise_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/hotels/{hotel_id}/routes/{target}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["hotel_route_api_v1_hotels__hotel_id__routes__target__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/hotels/{hotel_id}/climate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["hotel_climate_api_v1_hotels__hotel_id__climate_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/hotels/{hotel_id}/day": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["hotel_day_api_v1_hotels__hotel_id__day_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/characteristics": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["list_characteristics_api_v1_characteristics_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/runs/{run_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_run_api_v1_runs__run_id__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/runs/{run_id}/events": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["run_events_api_v1_runs__run_id__events_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/events": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["hotel_events_api_v1_events_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/intents": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["parse_intent_api_v1_intents_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/searches": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["create_search_api_v1_searches_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/searches/{search_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_search_api_v1_searches__search_id__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/searches/{search_id}/wishes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["add_wish_api_v1_searches__search_id__wishes_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/searches/{search_id}/research": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["research_chip_api_v1_searches__search_id__research_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/moods": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["moods_api_v1_moods_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/compare": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["compare_hotels_api_v1_compare_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/hotels/{hotel_id}/similar": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["similar_hotels_api_v1_hotels__hotel_id__similar_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/registry": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["registry_api_v1_console_registry_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/characteristics": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["learn_api_v1_console_characteristics_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/characteristics/{key}/publish": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["publish_api_v1_console_characteristics__key__publish_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/runs": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["runs_api_v1_console_runs_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/conflicts": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["conflicts_api_v1_console_conflicts_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/conflicts/{conflict_id}/resolve": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["resolve_api_v1_console_conflicts__conflict_id__resolve_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/changes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["changes_api_v1_console_changes_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/world/buildings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["add_building_api_v1_console_world_buildings_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/world/buildings/{change_id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    delete: operations["revert_building_api_v1_console_world_buildings__change_id__delete"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/settings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["get_settings_api_v1_console_settings_get"];
    put: operations["put_settings_api_v1_console_settings_put"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/demo/reset": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["demo_reset_api_v1_console_demo_reset_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/hotels/reserve": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["reserve_api_v1_console_hotels_reserve_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/hotels": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: operations["onboard_api_v1_console_hotels_post"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/console/quality": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: operations["quality_api_v1_console_quality_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    AccountOut: {
      id: string;
      email: string;
      username: string | null;
      role: components["schemas"]["Role"];
      persona: string | null;
    };
    AgentKind:
      | "researcher"
      | "curator"
      | "liaison"
      | "reconciler"
      | "watcher"
      | "intent"
      | "matcher"
      | "simulator";
    AgentRunOut: {
      id: string;
      agent: components["schemas"]["AgentKind"];
      goal: string;
      planner: components["schemas"]["Planner"];
      status: components["schemas"]["RunStatus"];
      createdAt: string;
      startedAt?: string | null;
      finishedAt?: string | null;
      steps: components["schemas"]["AgentStepOut"][];
      usage?: components["schemas"]["UsageOut"] | null;
      subject?: {
        [key: string]: unknown;
      } | null;
    };
    AgentStepOut: {
      seq: number;
      at: string;
      kind: "reason" | "tool" | "result" | "decision" | "error";
      tool?: string | null;
      summary: string;
      args?: unknown;
      output?: unknown;
      durationMs?: number | null;
    };
    AnswerIn: {
      text: string;
      choice?: string | null;
      value?: unknown;
      mappings?: components["schemas"]["FacadeMappingIn"][] | null;
    };
    AnswerOut: {
      answerId: string;
      parsed: {
        [key: string]: unknown;
      };
      parseConfidence: number;
      parser: string;
      changedFacts: components["schemas"]["FactOut"][];
      clarification: string | null;
    };
    BookingIn: {
      hotelId: string;
      roomTypeId: string;
      ratePlanId: string;
      checkIn: string;
      checkOut: string;
      guests: components["schemas"]["Guests"];
      request?: string | null;
      searchId?: string | null;
    };
    BookingOut: {
      id: string;
      hotelId: string;
      roomTypeId: string;
      ratePlanId: string;
      checkIn: string;
      checkOut: string;
      guests: components["schemas"]["Guests"];
      request: string;
      status: components["schemas"]["BookingStatus"];
      hotelReply: string | null;
      priceDemo: number;
    };
    BookingStatus: "requested" | "confirmed" | "alternative_offered" | "declined" | "completed";
    BuildingRequest: {
      lon: number;
      lat: number;
      floors: number;
      widthM: number;
      depthM: number;
      title?: string | null;
    };
    ChangedFactsOut: {
      changedFacts: components["schemas"]["FactOut"][];
    };
    CharacteristicOut: {
      key: string;
      title: string;
      how: string;
      checkable: components["schemas"]["Checkable"];
      level: string;
      method: string;
      status: "published" | "provisional" | "draft";
      synonyms: string[];
      ttlDays: number;
      coverage?: number | null;
      avgConfidence?: number | null;
    };
    CharacteristicQuality: {
      key: string;
      n: number;
      accuracy: number | null;
      ece: number | null;
      coverage: number | null;
      currentCoverage: number | null;
      confidentCoverage: number | null;
      factCount: number;
      reliability: components["schemas"]["ReliabilityBin"][];
    };
    Checkable: "compute" | "ask_hotelier" | "cannot";
    ChipResultOut: {
      chipId: string;
      verdict: "yes" | "partial" | "no" | "unknown";
      probability: number | null;
      factId?: string | null;
      line: string;
    };
    ClimateOut: {
      hotelId: string;
      checkIn: string;
      checkOut: string;
      days: number;
      station: string;
      period: string;
      values: components["schemas"]["ClimateValuesOut"];
      coverage: components["schemas"]["ClimateValuesOut"];
      confidence: components["schemas"]["ClimateValuesOut"];
      monthDays: {
        [key: string]: number;
      };
      attribution: string;
      caveats: string[];
    };
    ClimateValuesOut: {
      airMaxC?: number | null;
      airMinC?: number | null;
      waterC?: number | null;
      sunHours?: number | null;
      rainDays?: number | null;
      daylightH?: number | null;
    };
    CompareIn: {
      selections: components["schemas"]["SelectionIn"][];
      chips?: components["schemas"]["IntentChipModel"][];
      trip?: components["schemas"]["TripModel"] | null;
    };
    CompareOut: {
      intent: components["schemas"]["IntentModel"];
      matches: components["schemas"]["HotelMatchOut"][];
      rows: components["schemas"]["ComparisonRow"][];
      summary: string;
    };
    ComparisonRow: {
      chipId: string;
      label: string;
      results: components["schemas"]["ChipResultOut"][];
    };
    CorrectionIn: {
      text: string;
      choice?: string | null;
      value?: unknown;
      mappings?: components["schemas"]["FacadeMappingIn"][] | null;
      scope?: components["schemas"]["ScopeIn"] | null;
    };
    CoverageOut: {
      known: number;
      total: number;
      share: number;
    };
    DayPlanOut: {
      hotelId: string;
      date: string;
      slots: components["schemas"]["DaySlotOut"][];
      sunset: components["schemas"]["DaySunsetOut"];
      attribution: string;
      caveats: string[];
    };
    DayRouteOut: {
      minutes: number;
      backMinutes: number;
      climbM: number | null;
      backClimbM: number | null;
      steps: number | null;
      backSteps: number | null;
      crossings: number | null;
      backCrossings: number | null;
      geometry: components["schemas"]["LineStringOut"];
      elevationProfile: [number, number | null][];
      estimated: boolean;
      uncertainShare: number | null;
      osmRefs: string[];
    };
    DaySlotOut: {
      time: string;
      title: string;
      place?: string | null;
      osmRef?: string | null;
      route?: components["schemas"]["DayRouteOut"] | null;
      unavailableReason?: string | null;
      openingHours?: string | null;
    };
    DaySunsetOut: {
      time: string;
      fromWindow: boolean;
      spot?: string | null;
      windowScope?: components["schemas"]["ScopeOut"] | null;
    };
    DecisionIn: {
      status: "confirmed" | "alternative_offered" | "declined";
      reply: string;
    };
    DemandItemOut: {
      characteristic: string;
      count: number;
    };
    DemandOut: {
      hotelId: string;
      district: string;
      days: 7;
      items: components["schemas"]["DemandItemOut"][];
    };
    DemoLoginRequest: {
      persona: string;
    };
    DemoResetOut: {
      summary: string;
    };
    EvidenceOut: {
      kind:
        | "horizon_panorama"
        | "noise_facades"
        | "route_profile"
        | "climate_chart"
        | "hotelier_answer"
        | "osm_objects"
        | "map_layer"
        | "text";
      summary: string;
      params?: {
        [key: string]: unknown;
      } | null;
      osmRefs?: string[];
      attribution: string;
    };
    Facade: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
    FacadeMappingIn: {
      roomTypeId: string;
      facade: components["schemas"]["Facade"];
      floorFrom: number;
      floorTo: number;
    };
    FacadeNoiseOut: {
      facade: components["schemas"]["Facade"];
      day: components["schemas"]["NoiseLevelOut"];
      night: components["schemas"]["NoiseLevelOut"];
    };
    FacadesIn: {
      mappings: components["schemas"]["FacadeMappingIn"][];
    };
    FactDetailOut: {
      id: string;
      hotelId: string;
      characteristic: string;
      statement: string;
      scopeText: string;
      value: unknown;
      scope: components["schemas"]["ScopeOut"];
      confidence: number;
      confidenceLabel: "точно" | "скорее да" | "не уверены" | "скорее нет";
      source: components["schemas"]["SourceKind"];
      sourceLabel: string;
      method: string;
      observedAt: string;
      validUntil?: string | null;
      status: "ok" | "stale" | "conflict";
      evidence: components["schemas"]["EvidenceOut"][];
      caveats: string[];
      conflictId?: string | null;
      isDemo: boolean;
      sources: components["schemas"]["FactSourceOut"][];
      history: components["schemas"]["FactHistoryOut"][];
    };
    FactHistoryOut: {
      at: string;
      statement: string;
      confidence: number;
      reason: string;
    };
    FactOut: {
      id: string;
      hotelId: string;
      characteristic: string;
      statement: string;
      scopeText: string;
      value: unknown;
      scope: components["schemas"]["ScopeOut"];
      confidence: number;
      confidenceLabel: "точно" | "скорее да" | "не уверены" | "скорее нет";
      source: components["schemas"]["SourceKind"];
      sourceLabel: string;
      method: string;
      observedAt: string;
      validUntil?: string | null;
      status: "ok" | "stale" | "conflict";
      evidence: components["schemas"]["EvidenceOut"][];
      caveats: string[];
      conflictId?: string | null;
      isDemo: boolean;
    };
    FactSourceOut: {
      kind: components["schemas"]["SourceKind"];
      label: string;
      observedAt: string;
      confidence: number;
      ref?: string | null;
      statement?: string | null;
    };
    FeedbackIn: {
      answers: components["schemas"]["FeedbackItem"][];
    };
    FeedbackItem: {
      factId: string;
      answer: boolean;
    };
    Guests: {
      adults: number;
      children: number;
    };
    HTTPValidationError: {
      detail?: components["schemas"]["ValidationError"][];
    };
    HorizonRayOut: {
      azimuthDeg: number;
      angleDeg: number | null;
      kind: "building" | "terrain" | "sea" | "sky" | "unknown";
      seaLowDeg: number | null;
      seaHighDeg: number | null;
    };
    HotelDemoOut: {
      rating: number;
      ratingLabel: string;
      tagline: string;
      amenities: string[];
    };
    HotelMatchOut: {
      hotelId: string;
      name: string;
      area: string;
      location: [number, number];
      score: number;
      disappointmentRisk: number;
      perChip: components["schemas"]["ChipResultOut"][];
      tradeoff?: string | null;
      recommendation?: components["schemas"]["RecommendationOut"] | null;
      thumbnail: components["schemas"]["ThumbnailOut"];
      priceFromDemo?: number | null;
    };
    HotelOut: {
      id: string;
      osmId: string;
      name: string;
      stars?: number | null;
      area: string;
      address: string;
      location: [number, number];
      floors: number;
      facades: components["schemas"]["Facade"][];
      demo: components["schemas"]["HotelDemoOut"];
      priceFromDemo?: number | null;
      rooms: components["schemas"]["RoomTypeOut"][];
      facts: components["schemas"]["FactOut"][];
      unknowns: components["schemas"]["UnknownOut"][];
      nearby: components["schemas"]["NearbyOut"][];
    };
    Importance: "must" | "important" | "nice";
    Improvement: "quieter" | "cheaper" | "closer_to_beach";
    IntentChipModel: {
      id: string;
      characteristic?: string | null;
      label: string;
      importance: components["schemas"]["Importance"];
      checkable: components["schemas"]["Checkable"];
      params?: {
        [key: string]: unknown;
      };
      fromProfile: boolean;
    };
    IntentModel: {
      text?: string | null;
      chips: components["schemas"]["IntentChipModel"][];
      trip: components["schemas"]["TripModel"];
      hints?: string[];
      planner: "llm" | "rules";
    };
    IntentRequest: {
      text: string;
    };
    LearnRequest: {
      description: string;
    };
    LineStringOut: {
      type: "LineString";
      coordinates: [number, number][];
    };
    LoginRequest: {
      email: string;
      password: string;
    };
    MoodOut: {
      id: string;
      title: string;
      description: string;
      count: number;
      countLabel: string;
      month: number;
      chips: components["schemas"]["IntentChipModel"][];
    };
    NearbyOut: {
      kind: string;
      name: string;
      distanceText: string;
      osmRef?: string | null;
    };
    NoiseLevelOut: {
      indexDb: number | null;
      category: string | null;
      confidence: number;
      sources: components["schemas"]["NoiseSourceOut"][];
    };
    NoiseOut: {
      hotelId: string;
      facades: components["schemas"]["FacadeNoiseOut"][];
      unmodelledRefs: string[];
      completeness: number;
      attribution: string;
      caveats: string[];
    };
    NoiseSourceOut: {
      osmRef: string;
      kind: string;
      indexDb: number;
      distanceM: number;
      screened: boolean;
      orientationLossDb: number;
    };
    NotificationOut: {
      id: string;
      audience: string;
      kind: string;
      title: string;
      body: string;
      at: string;
      read: boolean;
      link: string | null;
    };
    OnboardRequest: {
      osmId: string;
    };
    OnboardStarted: {
      runId: string;
      hotelId: string;
    };
    PartnerOverviewOut: {
      hotelId: string;
      name: string;
      facts: components["schemas"]["FactOut"][];
      conflicts: components["schemas"]["app__api__schemas__partner__ConflictOut"][];
      coverage: components["schemas"]["CoverageOut"];
    };
    PeakOut: {
      ref: string;
      name: string | null;
      distanceM: number;
      azimuthDeg: number;
      elevationDeg: number;
    };
    PersonaOut: {
      key: string;
      role: components["schemas"]["Role"];
      name: string;
      title: string;
      hotels?: string[];
    };
    Planner: "llm" | "rules";
    QualityReport: {
      generatedAt: string;
      perCharacteristic: components["schemas"]["CharacteristicQuality"][];
      hotelierShare: number | null;
      parseAccuracy: {
        [key: string]: number | null;
      };
      ndcg10: number | null;
      gold: {
        [key: string]: unknown;
      };
      knowledge: {
        [key: string]: unknown;
      };
      intents: {
        [key: string]: unknown;
      };
      hotelierAnswers: {
        [key: string]: unknown;
      };
      curator: {
        [key: string]: unknown;
      };
      search: {
        [key: string]: unknown;
      };
      evaluationDate: string;
      llmStatus: string;
    };
    QuestionOut: {
      id: string;
      hotelId: string;
      characteristic: string;
      text: string;
      why: string;
      value: number;
      answerKind: "facade_mapping" | "choice" | "number" | "free_text";
      options: string[];
      status: "open" | "answered";
    };
    RatePlanOut: {
      id: string;
      meal: string;
      cancel: string;
      pay: string;
      priceDemo: number;
      tag?: string | null;
    };
    RecommendationOut: {
      roomTypeId?: string | null;
      roomName?: string | null;
      scope: components["schemas"]["ScopeOut"];
      scopeText: string;
      request: string;
      confirmedByHotel: boolean;
      priceDemo?: number | null;
    };
    RegisterRequest: {
      email: string;
      password: string;
      username?: string | null;
    };
    RegistryLineOut: {
      key: string;
      title: string;
      how: string;
      checkable: components["schemas"]["Checkable"];
      level: string;
      method: string;
      status: "published" | "provisional" | "draft";
      synonyms: string[];
      ttlDays: number;
      coverage?: number | null;
      avgConfidence?: number | null;
      staleShare: number;
      conflicts: number;
      learnedFrom?: string | null;
      recipe: {
        [key: string]: unknown;
      };
    };
    RelaxationOut: {
      chipId: string;
      label: string;
      wouldMatch: number;
    };
    ReliabilityBin: {
      from: number;
      to: number;
      n: number;
      meanProbability: number | null;
      positiveRate: number | null;
    };
    ResearchOut: {
      chipId: string;
      hotelIds: string[];
      runId?: string | null;
    };
    ResearchRequest: {
      chipId: string;
    };
    ReserveHotelOut: {
      osmId: string;
      name: string;
      district: string;
      location: [number, number];
      floors: number;
    };
    ResolveRequest: {
      resolution: string;
    };
    Role: "guest" | "hotelier" | "operator";
    RoomTypeOut: {
      id: string;
      name: string;
      area: number;
      bed: string;
      capacity: number;
      facades: components["schemas"]["Facade"][];
      floors?: [number, number] | null;
      confirmedByHotel: boolean;
      rates: components["schemas"]["RatePlanOut"][];
    };
    RouteLegOut: {
      minutes: number;
      lengthM: number | null;
      climbM: number | null;
      descentM: number | null;
      steps: number | null;
      crossings: number | null;
    };
    RouteOut: {
      hotelId: string;
      targetRef: string;
      targetName: string | null;
      profile: components["schemas"]["WalkProfile"];
      there: components["schemas"]["RouteLegOut"];
      back: components["schemas"]["RouteLegOut"];
      geometry: components["schemas"]["LineStringOut"];
      elevationProfile: [number, number | null][];
      estimated: boolean;
      uncertainShare: number | null;
      osmRefs: string[];
      attribution: string;
      caveats: string[];
    };
    RunStarted: {
      runId: string;
    };
    RunStatus: "queued" | "running" | "done" | "failed";
    ScopeIn: {
      facades?: components["schemas"]["Facade"][] | null;
      floorFrom?: number | null;
      floorTo?: number | null;
      months?: number[] | null;
      roomTypeIds?: string[] | null;
    };
    ScopeOut: {
      [key: string]: unknown;
    };
    SearchRequest: {
      text?: string | null;
      chips?: components["schemas"]["IntentChipModel"][] | null;
      trip?: components["schemas"]["TripModel"] | null;
      useProfile: boolean;
    };
    SearchResultOut: {
      searchId: string;
      intent: components["schemas"]["IntentModel"];
      matches: components["schemas"]["HotelMatchOut"][];
      relaxations: components["schemas"]["RelaxationOut"][];
      research: components["schemas"]["ResearchOut"][];
    };
    SelectionIn: {
      hotelId: string;
      roomTypeId?: string | null;
      facade?: components["schemas"]["Facade"] | null;
      floor?: number | null;
    };
    SettingsModel: {
      llmMode: "auto" | "off";
      llmAvailable: boolean;
    };
    SimilarIn: {
      change: components["schemas"]["Improvement"];
      chips?: components["schemas"]["IntentChipModel"][];
      trip?: components["schemas"]["TripModel"] | null;
    };
    SimilarOut: {
      sourceId: string;
      change: components["schemas"]["Improvement"];
      intent: components["schemas"]["IntentModel"];
      matches: components["schemas"]["HotelMatchOut"][];
      caveats: string[];
    };
    SolarIntersectionOut: {
      at: string;
      behind: string;
    };
    SourceKind: "computed" | "open_data" | "hotelier" | "guest" | "demo_card";
    SunPositionOut: {
      at: string;
      azimuthDeg: number;
      elevationDeg: number;
    };
    SunsetOut: {
      date: string;
      at: string;
    };
    TastePatch: {
      enabled?: boolean | null;
      weights?: components["schemas"]["TasteWeightIn"][] | null;
    };
    TasteProfileOut: {
      enabled: boolean;
      summary: string[];
      weights: components["schemas"]["TasteWeightOut"][];
    };
    TasteWeightIn: {
      characteristic: string;
      weight: number;
    };
    TasteWeightOut: {
      characteristic: string;
      weight: number;
      because: string;
    };
    ThumbnailOut: {
      kind: "horizon" | "facades" | "map";
      params: {
        [key: string]: unknown;
      };
    };
    TokenPair: {
      access_token: string;
      refresh_token?: string | null;
      token_type: "bearer";
      expires_in: number;
    };
    TripModel: {
      from?: string | null;
      to?: string | null;
      month?: number | null;
      adults?: number | null;
      children?: number | null;
      budgetPerNight?: number | null;
      area?: string | null;
    };
    TripOut: {
      booking: components["schemas"]["BookingOut"];
      promised: {
        [key: string]: unknown;
      }[];
      facts: components["schemas"]["FactOut"][];
      climate: components["schemas"]["ClimateOut"] | null;
      sunsets: components["schemas"]["SunsetOut"][];
      beachRoute: components["schemas"]["RouteOut"] | null;
      caveats: string[];
    };
    UnknownOut: {
      characteristic: string;
      question: string;
      why: string;
    };
    UsageOut: {
      requests: number;
      inputTokens: number;
      outputTokens: number;
    };
    ValidationError: {
      loc: (string | number)[];
      msg: string;
      type: string;
      input?: unknown;
      ctx?: Record<string, never>;
    };
    WalkProfile: "walk" | "stroller" | "wheelchair";
    WindowOut: {
      hotelId: string;
      facade: components["schemas"]["Facade"];
      floor: number;
      date: string;
      horizon: components["schemas"]["HorizonRayOut"][];
      peaks: components["schemas"]["PeakOut"][];
      sunPath: components["schemas"]["SunPositionOut"][];
      sunrise: components["schemas"]["SunPositionOut"];
      sunset: components["schemas"]["SunPositionOut"];
      disappearance: components["schemas"]["SolarIntersectionOut"] | null;
      appearance: components["schemas"]["SolarIntersectionOut"] | null;
      seaFraction: number;
      minimumSeaFloor: number | null;
      timezone: string;
      attribution: string;
      caveats: string[];
    };
    WishStarted: {
      runId?: string | null;
      search: components["schemas"]["SearchResultOut"];
    };
    WorldChangeOut: {
      id: string;
      kind: "building_added" | "building_removed" | "construction" | "poi_opened" | "osm_diff";
      title: string;
      at: string;
      affectedHotels: string[];
      runId?: string | null;
      reverted: boolean;
    };
    WorldChangeStarted: {
      changeId: string;
      runId: string;
    };
    app__api__schemas__console__ConflictOut: {
      id: string;
      hotelId: string;
      characteristic: string;
      claims: {
        [key: string]: unknown;
      }[];
      rule: "physics" | "hotelier" | "freshest" | "guests";
      resolution: string;
      status: "open" | "resolved" | "waiting_hotel";
      cells: number;
      questionId?: string | null;
      createdAt: string;
    };
    app__api__schemas__partner__ConflictOut: {
      id: string;
      hotelId: string;
      characteristic: string;
      claims: {
        [key: string]: unknown;
      }[];
      rule: string;
      resolution: string;
      status: string;
      questionId: string | null;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  health_health_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            [key: string]: string;
          };
        };
      };
    };
  };
  health_api_health_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            [key: string]: string;
          };
        };
      };
    };
  };
  ready_api_ready_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": unknown;
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  register_api_v1_auth_register_post: {
    parameters: {
      query?: never;
      header?: {
        "X-Client"?: "web" | "mobile";
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["RegisterRequest"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TokenPair"];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  login_api_v1_auth_login_post: {
    parameters: {
      query?: never;
      header?: {
        "X-Client"?: "web" | "mobile";
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LoginRequest"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TokenPair"];
        };
      };
      401: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  personas_api_v1_auth_personas_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PersonaOut"][];
        };
      };
    };
  };
  demo_login_api_v1_auth_demo_post: {
    parameters: {
      query?: never;
      header?: {
        "X-Client"?: "web" | "mobile";
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["DemoLoginRequest"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TokenPair"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  refresh_api_v1_auth_refresh_post: {
    parameters: {
      query?: never;
      header?: {
        "X-CSRF-Token"?: string | null;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TokenPair"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  logout_api_v1_auth_logout_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  logout_all_api_v1_auth_logout_all_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  get_me_api_v1_me_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountOut"];
        };
      };
    };
  };
  get_hotel_api_v1_partner_hotels__hotel_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PartnerOverviewOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  get_questions_api_v1_partner_hotels__hotel_id__questions_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["QuestionOut"][];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  post_answer_api_v1_partner_questions__question_id__answers_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        question_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["AnswerIn"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AnswerOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  put_facades_api_v1_partner_hotels__hotel_id__facades_put: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["FacadesIn"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ChangedFactsOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  confirm_fact_api_v1_partner_facts__fact_id__confirm_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        fact_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ChangedFactsOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  correct_fact_api_v1_partner_facts__fact_id__correct_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        fact_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CorrectionIn"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ChangedFactsOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  get_requests_api_v1_partner_hotels__hotel_id__requests_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingOut"][];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  decide_request_api_v1_partner_requests__booking_id__decision_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        booking_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["DecisionIn"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  get_demand_api_v1_partner_hotels__hotel_id__demand_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["DemandOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  get_notifications_api_v1_partner_hotels__hotel_id__notifications_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["NotificationOut"][];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  create_booking_api_v1_bookings_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BookingIn"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  get_trip_api_v1_trips__booking_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        booking_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TripOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  post_feedback_api_v1_trips__booking_id__feedback_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        booking_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["FeedbackIn"];
      };
    };
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  notifications_api_v1_me_notifications_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["NotificationOut"][];
        };
      };
    };
  };
  get_taste_api_v1_me_taste_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TasteProfileOut"];
        };
      };
    };
  };
  reset_taste_api_v1_me_taste_delete: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  patch_taste_api_v1_me_taste_patch: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["TastePatch"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TasteProfileOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  hotel_window_api_v1_hotels__hotel_id__window_get: {
    parameters: {
      query: {
        facade: components["schemas"]["Facade"];
        floor: number;
        date: string;
      };
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WindowOut"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  list_hotels_api_v1_hotels_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HotelOut"][];
        };
      };
    };
  };
  get_hotel_api_v1_hotels__hotel_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HotelOut"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  hotel_facts_api_v1_hotels__hotel_id__facts_get: {
    parameters: {
      query?: {
        characteristic?: string | null;
      };
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FactOut"][];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  fact_detail_api_v1_facts__fact_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        fact_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FactDetailOut"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  hotel_noise_api_v1_hotels__hotel_id__noise_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["NoiseOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  hotel_route_api_v1_hotels__hotel_id__routes__target__get: {
    parameters: {
      query?: {
        profile?: components["schemas"]["WalkProfile"];
      };
      header?: never;
      path: {
        hotel_id: string;
        target: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RouteOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  hotel_climate_api_v1_hotels__hotel_id__climate_get: {
    parameters: {
      query: {
        from: string;
        to: string;
      };
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ClimateOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  hotel_day_api_v1_hotels__hotel_id__day_get: {
    parameters: {
      query: {
        date: string;
      };
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["DayPlanOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  list_characteristics_api_v1_characteristics_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CharacteristicOut"][];
        };
      };
    };
  };
  get_run_api_v1_runs__run_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        run_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AgentRunOut"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  run_events_api_v1_runs__run_id__events_get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        run_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  hotel_events_api_v1_events_get: {
    parameters: {
      query?: {
        hotels?: string[] | null;
        search?: string | null;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  parse_intent_api_v1_intents_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["IntentRequest"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["IntentModel"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  create_search_api_v1_searches_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SearchRequest"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SearchResultOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  get_search_api_v1_searches__search_id__get: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        search_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SearchResultOut"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  add_wish_api_v1_searches__search_id__wishes_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        search_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["IntentRequest"];
      };
    };
    responses: {
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WishStarted"];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  research_chip_api_v1_searches__search_id__research_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        search_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ResearchRequest"];
      };
    };
    responses: {
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RunStarted"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  moods_api_v1_moods_get: {
    parameters: {
      query?: {
        month?: number | null;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MoodOut"][];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  compare_hotels_api_v1_compare_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CompareIn"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CompareOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  similar_hotels_api_v1_hotels__hotel_id__similar_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        hotel_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SimilarIn"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SimilarOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  registry_api_v1_console_registry_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RegistryLineOut"][];
        };
      };
    };
  };
  learn_api_v1_console_characteristics_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LearnRequest"];
      };
    };
    responses: {
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RunStarted"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  publish_api_v1_console_characteristics__key__publish_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        key: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RunStarted"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  runs_api_v1_console_runs_get: {
    parameters: {
      query?: {
        agent?: components["schemas"]["AgentKind"] | null;
        hotel?: string | null;
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AgentRunOut"][];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  conflicts_api_v1_console_conflicts_get: {
    parameters: {
      query?: {
        open?: boolean;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["app__api__schemas__console__ConflictOut"][];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  resolve_api_v1_console_conflicts__conflict_id__resolve_post: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        conflict_id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ResolveRequest"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["app__api__schemas__console__ConflictOut"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  changes_api_v1_console_changes_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WorldChangeOut"][];
        };
      };
    };
  };
  add_building_api_v1_console_world_buildings_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BuildingRequest"];
      };
    };
    responses: {
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WorldChangeStarted"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  revert_building_api_v1_console_world_buildings__change_id__delete: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        change_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RunStarted"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  get_settings_api_v1_console_settings_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SettingsModel"];
        };
      };
    };
  };
  put_settings_api_v1_console_settings_put: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SettingsModel"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SettingsModel"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  demo_reset_api_v1_console_demo_reset_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["DemoResetOut"];
        };
      };
    };
  };
  reserve_api_v1_console_hotels_reserve_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReserveHotelOut"][];
        };
      };
    };
  };
  onboard_api_v1_console_hotels_post: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["OnboardRequest"];
      };
    };
    responses: {
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OnboardStarted"];
        };
      };
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  quality_api_v1_console_quality_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["QualityReport"];
        };
      };
    };
  };
}
