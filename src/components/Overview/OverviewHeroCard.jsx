// Import the React library to create the component
import React from 'react';
// Import utility functions for aggregating data (mtd), calculating scores (calculateScore), and formatting values (formatVal)
import { mtd, calculateScore, formatVal } from '../../store/kpiStore';
// Import UI icons (TrendingUp, TrendingDown, AlertCircle) from the lucide-react library
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
// Import a helper function that filters a list of weeks down to just the current month's weeks
import { weeksInMonth } from '../../utils/dateUtils';

// Export the OverviewHeroCard component as the default export. It accepts 'department' (renamed to 'd') and 'weeks' as props.
export default function OverviewHeroCard({ department: d, weeks }) {
  // Get only the weeks that fall within the current month so we can calculate Month-To-Date (MTD) values
  const mw = weeksInMonth(weeks); 
  
  // Initialize variables to keep track of the worst-performing metric ('worst') and its score ('worstSc')
  let worst = null, worstSc = null;
  
  // Filter the department's metrics to find valid ones. 
  // If the department is 'hiring', we ignore metrics that contain "Position:" in their sub-label (so we only look at high-level metrics).
  const validMetrics = d.metrics.filter(m => d.id !== 'hiring' || !/·\s*Position:/i.test(m.sub || ''));
  
  // Loop through all the valid metrics to find which one has the worst score
  validMetrics.forEach(m => {
    // We skip metrics where the goal direction is 'zero' (e.g. tracking incidents or complaints) because their scoring logic doesn't compare easily by percentage
    if (m.dir === 'zero') return;
    
    // Calculate the Month-To-Date aggregated plan and actual values for this specific metric
    const mt = mtd(m, mw);
    
    // Calculate a performance score (percentage and color) based on the plan, actual, and target direction
    const sc = calculateScore(mt.plan, mt.actual, m.dir);
    
    // If the score is a valid percentage, AND (it's the first one we checked OR its percentage is lower/worse than our current worst score)...
    if (sc.pct !== null && sc.pct !== undefined && (worstSc === null || sc.pct < worstSc.pct)) {
      // ...then set this metric as the new 'worst' metric
      worst = m;
      // ...and save its score as the new 'worst' score
      worstSc = sc;
    }
  });
  
  // If we couldn't find a worst metric (for example, if all metrics were 'zero' direction or missing data)...
  if (!worst) {
    // If there are absolutely no valid metrics at all, don't render the card (return null)
    if (!validMetrics.length) return null;
    
    // Otherwise, just default to picking the very first valid metric in the list
    worst = validMetrics[0];
    
    // Calculate the score for this fallback metric
    worstSc = calculateScore(mtd(worst, mw).plan, mtd(worst, mw).actual, worst.dir);
    
    // If we still can't get a valid score, don't render the card
    if (!worstSc) return null;
  }
  
  // Recalculate or grab the Month-To-Date totals for our chosen (worst) metric
  const mt = mtd(worst, mw);
  
  // Determine the CSS class based on the metric's score color (green -> good, amber -> warning, red -> danger)
  const cls = worstSc.color === 'green' ? 'good' : (worstSc.color === 'amber' ? 'warning' : 'danger');
  
  // Format the "actual" value for display. If it's missing, show an em dash ('—'). Otherwise, format it and append its unit (e.g., '%', 'hrs')
  const valActual = (mt.actual === null || mt.actual === '') ? '—' : formatVal(mt.actual, worst.unit, worst.id) + (worst.unit ? ` ${worst.unit}` : '');
  
  // Format the "plan" (target) value for display. Similar logic as above, showing '—' if missing, or formatting and appending the unit.
  const valPlan = (mt.plan === null || mt.plan === '') ? '—' : formatVal(mt.plan, worst.unit, worst.id) + (worst.unit ? ` ${worst.unit}` : '');

  // Return the JSX (HTML) layout to render the card onto the screen
  return (
    // The main container for the card, applying the 'hero-card' class and our dynamic status class ('good', 'warning', 'danger')
    <div className={`hero-card ${cls}`}>
      {/* Display the department's emoji and name at the top of the card */}
      <div className="hero-dept">{d.emoji} {d.name}</div>
      {/* Display the name of the worst metric, indicating this is Month-To-Date (MTD) data */}
      <div className="hero-label">{worst.name} MTD</div>
      {/* Display the actual formatted value, styled according to its performance class */}
      <div className={`hero-val ${cls}`}>{valActual}</div>
      {/* Display the planned/target value just below the actual value */}
      <div className="hero-plan">Plan: {valPlan}</div>
      {/* Display a badge containing an icon and the score label (e.g. "-15%"), colored according to performance */}
      <div className={`hero-badge ${worstSc.color}`}>
        {/* Render a specific icon depending on the color: green gets an up arrow, amber gets a down arrow, others get an alert circle */}
        {worstSc.color === 'green' ? <TrendingUp size={12} style={{marginRight: 4}}/> : 
         worstSc.color === 'amber' ? <TrendingDown size={12} style={{marginRight: 4}}/> : 
         <AlertCircle size={12} style={{marginRight: 4}}/>}
        {/* Render the text label for the score (e.g., "-12%") */}
        {worstSc.label}
      </div>
    </div>
  );
}
