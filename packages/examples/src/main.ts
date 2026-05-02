import { of } from 'rxjs';
import { createButtonExample } from './components/button';
import { createPanelExample } from './components/panel';
import { createLabelExample } from './components/label';
import { createTextFieldExample } from './components/textfield';

import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';

const app = document.getElementById('app')!;

const layout = new LayoutBuilder()
  .asVertical()
  .withGap(LayoutGap.LARGE);

layout.addSlot().withContent(createLabelExample());
layout.addSlot().withContent(createTextFieldExample());
layout.addSlot().withContent(createButtonExample());

const panel = createPanelExample();
layout.addSlot().withContent(panel);

app.appendChild(layout.build());
