
export type ActionAttempt = {
  action: string;
  status: "COMPLETED" | "FAILED";
  message: string;
};

export type ActionResult = {
  action: string;
  status: "COMPLETED" | "FAILED";
  message: string;
  usedFallback: boolean;
  attempts: ActionAttempt[];
};

export function executeAction(
  action: string,
  simulateFailure = false
): ActionResult {
  console.log(`Executing action: ${action}`);

  if (!simulateFailure) {
    const attempt: ActionAttempt = {
      action,
      status: "COMPLETED",
      message: `Action ${action} completed successfully (simulated).`
    };

    return {
      action,
      status: "COMPLETED",
      message: attempt.message,
      usedFallback: false,
      attempts: [attempt]
    };
  }

  const primaryAttempt: ActionAttempt = {
    action,
    status: "FAILED",
    message: `Primary action ${action} failed (simulated).`
  };

  console.log(primaryAttempt.message);

  const fallbackAction = "USE_SAFE_FALLBACK";

  const fallbackAttempt: ActionAttempt = {
    action: fallbackAction,
    status: "COMPLETED",
    message: "Fallback completed successfully (simulated)."
  };

  console.log(fallbackAttempt.message);

  return {
    action,
    status: "COMPLETED",
    message: "Primary action failed; fallback completed (simulated).",
    usedFallback: true,
    attempts: [primaryAttempt, fallbackAttempt]
  };
}
