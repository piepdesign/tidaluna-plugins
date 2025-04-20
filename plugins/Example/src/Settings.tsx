import React from "react";

import { InfoMessage } from "@luna/lib";
import { LunaSwitchSetting } from "@luna/ui";

export const Settings = () => {
	const onChange = React.useCallback((_: React.ChangeEvent<HTMLInputElement>, checked?: boolean) => {
		InfoMessage(`Example switch is now ${checked ? "on" : "off"}`);
	}, []);
	return <LunaSwitchSetting title="Example Switch" desc="This is an example switch" onChange={onChange} />;
};
