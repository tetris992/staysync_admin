import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import AdminDashboard from './admin/AdminDashboard';

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path="/" component={AdminDashboard} />
      </Switch>
    </Router>
  );
};

export default App;