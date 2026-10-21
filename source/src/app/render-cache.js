// One cache per render keeps repeated rule checks consistent and avoids repeated work.
let renderEvaluations = new WeakMap();

function beginRender() {
  renderEvaluations = new WeakMap();
}

function evaluationFor(plan) {
  if (!renderEvaluations.has(plan)) {
    renderEvaluations.set(plan, E.evaluate(plan, state));
  }
  return renderEvaluations.get(plan);
}
