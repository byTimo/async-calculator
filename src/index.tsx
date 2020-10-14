import React from 'react';
import ReactDOM from 'react-dom';
import { ArrayComp } from './ArrayComp';
import { Simple } from './Simple';

ReactDOM.render(
  <React.StrictMode>
    <div style={{display: "flex"}}>
      <Simple />
      <ArrayComp />
    </div>
  </React.StrictMode>,
  document.getElementById('root')
);
