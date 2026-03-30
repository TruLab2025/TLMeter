import React from "react";

type ResultsPanelProps = {
  sections: Array<Record<string, unknown>>;
};

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ sections }) => (
  <div data-section-count={sections.length}>
    Results panel placeholder ({sections.length} sections)
  </div>
);
