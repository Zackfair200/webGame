function assertIdentityPart(part) {
  if (part === undefined || part === null || part === '') {
    throw new Error('Decision action identity parts cannot be empty.');
  }
}

export function createDecisionActionId({ decisionType, actionType, identityParts = [] }) {
  const parts = [decisionType, actionType, ...identityParts];
  parts.forEach(assertIdentityPart);

  return parts.map((part) => encodeURIComponent(String(part))).join(':');
}

export function assertDecisionAction(action) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw new Error('decision action is required.');
  }

  if (typeof action.id !== 'string' || action.id === '') {
    throw new Error('decision action.id is required.');
  }

  if (typeof action.type !== 'string' || action.type === '') {
    throw new Error('decision action.type is required.');
  }
}

export function assertDecisionActionSelection(action) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw new Error('decision action selection is required.');
  }

  if (typeof action.id !== 'string' || action.id === '') {
    throw new Error('decision action selection.id is required.');
  }
}
