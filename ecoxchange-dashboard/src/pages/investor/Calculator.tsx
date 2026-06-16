import { ReturnsCalculator } from "../../components/calculator/ReturnsCalculator.js";

export function Calculator() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl text-darkBg">Returns Calculator</h1>
        <p className="mt-1 text-textMuted">
          Model projected outcomes for an EcoXchange solar investment. Adjust the
          inputs to see how your capital could grow.
        </p>
      </header>
      <ReturnsCalculator standalone />
    </div>
  );
}
