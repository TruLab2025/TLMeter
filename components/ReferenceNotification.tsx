import React from "react";

type ReferenceNotificationProps = {
  reference?: Record<string, unknown> | null;
};

export const ReferenceNotification: React.FC<ReferenceNotificationProps> = ({ reference }) => (
  reference ? <div>Reference notification placeholder</div> : null
);
