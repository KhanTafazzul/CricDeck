// CricDeck Core Cricket Scoring Logic

/**
 * Rotates strike between striker and non-striker
 */
export function rotateStrike(state) {
  if (!state) return state;
  const striker = state.striker ? { ...state.striker } : { name: 'Striker', runs: 0, balls: 0, fours: 0, sixes: 0 };
  const nonStriker = state.non_striker ? { ...state.non_striker } : { name: 'Non-Striker', runs: 0, balls: 0, fours: 0, sixes: 0 };
  return {
    ...state,
    striker: nonStriker,
    non_striker: striker
  };
}

/**
 * Formats overs to float format, e.g. 1 over and 2 balls => 1.2
 */
export function formatOvers(overs, balls) {
  return parseFloat(`${overs || 0}.${balls || 0}`);
}

/**
 * Calculates current run rate
 */
export function calculateRunRate(runs, overs, balls) {
  const totalBalls = (overs || 0) * 6 + (balls || 0);
  if (totalBalls === 0) return 0.00;
  return parseFloat((((runs || 0) / totalBalls) * 6).toFixed(2));
}

/**
 * Process a delivery action and return the updated match state
 * @param {Object} state - Current match state
 * @param {Object} action - Scoring action (e.g. RUNS, WIDE, NO_BALL, etc.)
 */
export function processDelivery(state, action) {
  if (!state) return state;

  // Create deep copy of state base properties to avoid direct mutations
  let newState = {
    ...state,
    striker: state.striker ? { ...state.striker } : { name: 'Striker', runs: 0, balls: 0, fours: 0, sixes: 0 },
    non_striker: state.non_striker ? { ...state.non_striker } : { name: 'Non-Striker', runs: 0, balls: 0, fours: 0, sixes: 0 },
    current_bowler: state.current_bowler ? { ...state.current_bowler } : { name: 'Bowler', overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0 },
    current_over_timeline: Array.isArray(state.current_over_timeline) ? [...state.current_over_timeline] : [],
    delivery_history: Array.isArray(state.delivery_history) ? [...state.delivery_history] : []
  };

  let isLegal = true;
  let runsAdded = 0;
  let extrasAdded = 0;
  let timelineLabel = '';

  switch (action.type) {
    case 'RUNS': {
      const runs = Number.isInteger(action.value) ? action.value : 0;
      runsAdded = runs;
      isLegal = true;
      timelineLabel = runs === 0 ? '•' : `${runs}`;

      // Update Batter stats
      newState.striker.runs += runs;
      newState.striker.balls += 1;
      if (runs === 4) newState.striker.fours += 1;
      if (runs === 6) newState.striker.sixes += 1;

      // Update Bowler stats
      newState.current_bowler.runs += runs;

      // Rotate strike on odd runs
      if (runs % 2 !== 0) {
        newState = rotateStrike(newState);
      }
      break;
    }

    case 'WIDE': {
      const additionalRuns = action.additionalRuns || 0; // runs run by batters
      extrasAdded = 1 + additionalRuns;
      runsAdded = extrasAdded;
      isLegal = false;
      timelineLabel = additionalRuns > 0 ? `Wd+${additionalRuns}` : 'Wd';

      // Wides do NOT count as balls faced by batter
      // Bowler is penalized for the wide penalty + additional runs run on it
      newState.current_bowler.runs += (1 + additionalRuns);

      // Rotate strike on odd additional runs
      if (additionalRuns % 2 !== 0) {
        newState = rotateStrike(newState);
      }
      break;
    }

    case 'NO_BALL': {
      const additionalRuns = action.additionalRuns || 0;
      const runType = action.runType || 'bat'; // 'bat' or 'byes' or 'leg_byes'
      isLegal = false;
      
      // No ball adds 1 penalty run automatically
      extrasAdded = 1; 
      
      // Striker faces 1 ball on a No Ball
      newState.striker.balls += 1;

      if (runType === 'bat') {
        runsAdded = 1 + additionalRuns;
        newState.striker.runs += additionalRuns;
        if (additionalRuns === 4) newState.striker.fours += 1;
        if (additionalRuns === 6) newState.striker.sixes += 1;
        
        // Bowler is penalized for no-ball penalty + runs hit
        newState.current_bowler.runs += (1 + additionalRuns);
        timelineLabel = `NB+${additionalRuns}`;
      } else {
        // Byes or leg byes on a No-Ball
        extrasAdded += additionalRuns; // additional runs go to extras
        runsAdded = 1 + additionalRuns;
        // Bowler is only penalized for the No-ball penalty (1 run), not the byes/leg-byes
        newState.current_bowler.runs += 1;
        timelineLabel = `NB+${additionalRuns}${runType === 'byes' ? 'B' : 'LB'}`;
      }

      // Rotate strike on odd additional runs
      if (additionalRuns % 2 !== 0) {
        newState = rotateStrike(newState);
      }
      break;
    }

    case 'BYES':
    case 'LEG_BYES': {
      const runs = action.value !== undefined ? action.value : (action.runsCompleted !== undefined ? action.runsCompleted : 0);
      extrasAdded = runs;
      runsAdded = runs;
      isLegal = true;
      timelineLabel = `${runs}${action.type === 'BYES' ? 'B' : 'LB'}`;

      // Batter faces a ball but gets 0 runs
      newState.striker.balls += 1;

      // Rotate strike on odd runs
      if (runs % 2 !== 0) {
        newState = rotateStrike(newState);
      }
      break;
    }

    case 'WICKET': {
      const { wicketType, dismissedBatterName, newBatterName, runsCompleted } = action;
      isLegal = wicketType !== 'run_out_wide' && wicketType !== 'run_out_noball';
      runsAdded = runsCompleted || 0;
      const incomingBatter = newBatterName || 'Next Batter';
      
      if (wicketType === 'run_out_wide') {
        // Run out on a Wide ball
        extrasAdded = 1;
        runsAdded = 1 + (runsCompleted || 0);
        newState.current_bowler.runs += 1;
        timelineLabel = `W(RO)+Wd`;
      } else if (wicketType === 'run_out_noball') {
        // Run out on a No-ball
        extrasAdded = 1;
        runsAdded = 1 + (runsCompleted || 0);
        newState.striker.balls += 1;
        newState.current_bowler.runs += 1;
        timelineLabel = `W(RO)+NB`;
      } else {
        // Standard legal ball wicket
        newState.striker.balls += 1;
        
        // Bowler gets credit for the wicket unless it's a run out or retired hurt
        if (wicketType !== 'run_out' && wicketType !== 'retired_hurt') {
          newState.current_bowler.wickets += 1;
        }
        
        timelineLabel = 'W';
      }

      newState.wickets += 1;

      // Handle strike rotation after wicket
      if (wicketType === 'caught' || wicketType === 'caught_behind') {
        // MCC 2022 Rule: New batter ALWAYS takes strike
        newState.striker = { name: incomingBatter, runs: 0, balls: 0, fours: 0, sixes: 0 };
      } else if (wicketType === 'run_out' || wicketType === 'run_out_wide' || wicketType === 'run_out_noball') {
        // Identify if striker or non-striker was run out
        const runsCount = runsCompleted || 0;
        const runsOdd = runsCount % 2 !== 0;

        if (dismissedBatterName === newState.striker.name) {
          // Striker dismissed
          newState.striker = { name: incomingBatter, runs: 0, balls: 0, fours: 0, sixes: 0 };
          if (runsOdd) {
            newState = rotateStrike(newState);
          }
        } else {
          // Non-striker dismissed
          newState.non_striker = { name: incomingBatter, runs: 0, balls: 0, fours: 0, sixes: 0 };
          if (runsOdd) {
            newState = rotateStrike(newState);
          }
        }
      } else {
        // Bowled, LBW, Stumped, etc.: New batter takes strike
        newState.striker = { name: incomingBatter, runs: 0, balls: 0, fours: 0, sixes: 0 };
      }
      break;
    }

    case 'HELMET_PENALTY': {
      runsAdded = 5;
      extrasAdded = 5;
      isLegal = false; // Helmet penalty does not add a ball to over
      timelineLabel = '+5P';
      break;
    }

    default:
      break;
  }

  // Update total runs
  newState.total_runs = (newState.total_runs || 0) + runsAdded;

  // Handle over calculations
  if (isLegal) {
    newState.balls_in_over = (newState.balls_in_over || 0) + 1;
    if (newState.balls_in_over === 6) {
      // Over complete!
      newState.overs = (newState.overs || 0) + 1;
      newState.balls_in_over = 0;
      
      // Update bowler's completed overs
      newState.current_bowler.overs = (newState.current_bowler.overs || 0) + 1;
      newState.current_bowler.balls = 0;

      // Swap strike automatically at the end of the over
      newState = rotateStrike(newState);

      // Check for Maiden over: Bowler conceded 0 runs in this over
      const timelineWithCurrent = [...newState.current_over_timeline, timelineLabel];
      const isMaiden = timelineWithCurrent.every(label => 
        label === '•' || label === 'W' || label.endsWith('B') || label.endsWith('LB')
      );

      if (isMaiden) {
        newState.current_bowler.maidens = (newState.current_bowler.maidens || 0) + 1;
      }
    } else {
      newState.current_bowler.balls = (newState.current_bowler.balls || 0) + 1;
    }
  }

  // Add delivery to timeline
  newState.current_over_timeline.push(timelineLabel);

  // Recalculate run rate
  newState.run_rate = calculateRunRate(newState.total_runs, newState.overs, newState.balls_in_over);

  // Clean snapshot of state for undo (DO NOT include recursive delivery_history)
  const cleanStateSnapshot = {
    team_a: state.team_a,
    team_b: state.team_b,
    toss_winner: state.toss_winner,
    elected_to: state.elected_to,
    current_innings: state.current_innings,
    status: state.status,
    total_runs: state.total_runs,
    wickets: state.wickets,
    overs: state.overs,
    balls_in_over: state.balls_in_over,
    run_rate: state.run_rate,
    striker: state.striker ? { ...state.striker } : null,
    non_striker: state.non_striker ? { ...state.non_striker } : null,
    current_bowler: state.current_bowler ? { ...state.current_bowler } : null,
    current_over_timeline: Array.isArray(state.current_over_timeline) ? [...state.current_over_timeline] : [],
    tournament_id: state.tournament_id,
    team_a_id: state.team_a_id,
    team_b_id: state.team_b_id,
    innings1_score: state.innings1_score,
    innings1_wickets: state.innings1_wickets,
    innings1_overs: state.innings1_overs,
    innings1_balls: state.innings1_balls,
    winner_id: state.winner_id,
    overs_quota: state.overs_quota
  };

  // Update ledger for undo
  const ledgerEntry = {
    delivery_index: newState.delivery_history.length,
    over_number: newState.balls_in_over === 0 && isLegal ? newState.overs : (newState.overs || 0) + 1,
    ball_number: isLegal ? (newState.balls_in_over === 0 ? 6 : newState.balls_in_over) : (newState.balls_in_over || 0) + 1,
    striker_name: state.striker?.name || 'Striker',
    non_striker_name: state.non_striker?.name || 'Non-Striker',
    bowler_name: state.current_bowler?.name || 'Bowler',
    runs_batter: runsAdded - extrasAdded,
    runs_extras: extrasAdded,
    extra_type: action.type === 'WIDE' ? 'wide' : (action.type === 'NO_BALL' ? 'no_ball' : (action.type === 'BYES' ? 'bye' : (action.type === 'LEG_BYES' ? 'leg_bye' : null))),
    wicket_type: action.type === 'WICKET' ? action.wicketType : null,
    dismissed_batter_name: action.type === 'WICKET' ? action.dismissedBatterName : null,
    fielder_name: action.fielderName || null,
    keeper_name: action.keeperName || null,
    is_legal: isLegal,
    innings: state.current_innings || 1,
    action: action,
    prevState: cleanStateSnapshot
  };

  newState.delivery_history.push(ledgerEntry);

  return newState;
}

/**
 * Performs an undo operation on the scoring state
 */
export function undoDelivery(state) {
  if (!state || !state.delivery_history || state.delivery_history.length === 0) return state;
  const history = [...state.delivery_history];
  const lastEntry = history.pop();
  if (!lastEntry || !lastEntry.prevState) return state;

  return {
    ...lastEntry.prevState,
    delivery_history: history
  };
}
