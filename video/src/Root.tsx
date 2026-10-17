import { Composition, Folder } from "remotion";
import { Promo } from "./Promo";
import { PromoV2 } from "./PromoV2";
import { PromoV3 } from "./PromoV3";
import { OpeningV3 } from "./v3/OpeningV3";
import { EditorV3 } from "./v3/EditorV3";
import { ColorsV3 } from "./v3/ColorsV3";
import { FlowV3 } from "./v3/FlowV3";
import { OpeningV2 } from "./v2/OpeningV2";
import { StylesV2 } from "./v2/StylesV2";
import { EditorV2 } from "./v2/EditorV2";
import { ColorsV2 } from "./v2/ColorsV2";
import { DevicesV2 } from "./v2/DevicesV2";
import { FlowV2 } from "./v2/FlowV2";
import { ClosingV2 } from "./v2/ClosingV2";
import { Opening } from "./scenes/Opening";
import { Styles } from "./scenes/Styles";
import { Editor } from "./scenes/Editor";
import { Devices } from "./scenes/Devices";
import { Flow } from "./scenes/Flow";
import { Closing } from "./scenes/Closing";
export const Root = () => (
  <>
    <Composition id="Furfolio-Promo-V3" component={PromoV3} width={1440} height={1080} fps={60} durationInFrames={1800} />
    <Folder name="V3-Scenes">
      <Composition id="Opening-V3" component={OpeningV3} width={1440} height={1080} fps={60} durationInFrames={210} />
      <Composition id="Editor-V3" component={EditorV3} width={1440} height={1080} fps={60} durationInFrames={390} />
      <Composition id="Colors-V3" component={ColorsV3} width={1440} height={1080} fps={60} durationInFrames={240} />
      <Composition id="Flow-V3" component={FlowV3} width={1440} height={1080} fps={60} durationInFrames={240} />
    </Folder>
    <Composition id="Furfolio-Promo-V2" component={PromoV2} width={1440} height={1080} fps={60} durationInFrames={1800} />
    <Folder name="V2-Scenes">
      <Composition id="Opening-V2" component={OpeningV2} width={1440} height={1080} fps={60} durationInFrames={120} />
      <Composition id="Styles-V2" component={StylesV2} width={1440} height={1080} fps={60} durationInFrames={240} />
      <Composition id="Editor-V2" component={EditorV2} width={1440} height={1080} fps={60} durationInFrames={240} />
      <Composition id="Colors-V2" component={ColorsV2} width={1440} height={1080} fps={60} durationInFrames={360} />
      <Composition id="Devices-V2" component={DevicesV2} width={1440} height={1080} fps={60} durationInFrames={240} />
      <Composition id="Flow-V2" component={FlowV2} width={1440} height={1080} fps={60} durationInFrames={360} />
      <Composition id="Closing-V2" component={ClosingV2} width={1440} height={1080} fps={60} durationInFrames={240} />
    </Folder>
    <Composition
      id="Furfolio-Promo"
      component={Promo}
      width={1440}
      height={1080}
      fps={60}
      durationInFrames={1800}
    />
    <Folder name="Scenes">
      <Composition
        id="Opening"
        component={Opening}
        width={1440}
        height={1080}
        fps={60}
        durationInFrames={240}
      />
      <Composition
        id="Styles"
        component={Styles}
        width={1440}
        height={1080}
        fps={60}
        durationInFrames={360}
      />
      <Composition
        id="Editor"
        component={Editor}
        width={1440}
        height={1080}
        fps={60}
        durationInFrames={360}
      />
      <Composition
        id="Devices"
        component={Devices}
        width={1440}
        height={1080}
        fps={60}
        durationInFrames={300}
      />
      <Composition
        id="Flow"
        component={Flow}
        width={1440}
        height={1080}
        fps={60}
        durationInFrames={300}
      />
      <Composition
        id="Closing"
        component={Closing}
        width={1440}
        height={1080}
        fps={60}
        durationInFrames={240}
      />
    </Folder>
  </>
);
