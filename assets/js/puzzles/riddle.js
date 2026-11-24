// Riddle plaque: free-text answer checked against accepted variants.
// validate and evaluate are DOM-free; document is used only inside render.

export const type = "riddle";

// Trim, collapse whitespace runs to one space, lower-case. Applied to both the
// player's answer and every accepted answer so authors need not guess casing.
export function normalize(s) {
  return String(s).trim().replace(/\s+/g, " ").toLowerCase();
}

export function validate(puzzle, path) {
  const errors = [];
  const answers = puzzle && puzzle.answers;
  if (!Array.isArray(answers) || answers.length === 0) {
    errors.push(`${path}.answers must be a non-empty array of strings`);
    return errors;
  }
  answers.forEach((a, i) => {
    // An answer that normalizes to "" would make an empty submission correct.
    if (typeof a !== "string" || normalize(a) === "") {
      errors.push(`${path}.answers[${i}] must be a non-empty string`);
    }
  });
  return errors;
}

export function evaluate(puzzle, answer) {
  const given = normalize(typeof answer === "string" ? answer : "");
  if (given === "") return "incorrect";
  const accepted = Array.isArray(puzzle && puzzle.answers) ? puzzle.answers : [];
  return accepted.some((a) => typeof a === "string" && normalize(a) === given)
    ? "correct"
    : "incorrect";
}

export function render(root, puzzle, ctx) {
  const prompt = document.createElement("p");
  prompt.className = "prompt";
  prompt.textContent = puzzle.prompt;

  const id = `${ctx.idPrefix}-answer`;
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = "Your answer";

  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.autocomplete = "off";
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ctx.onSubmit();
    }
  });

  root.append(prompt, label, input);
  return {
    getAnswer: () => input.value,
    focus: () => input.focus(),
  };
}
