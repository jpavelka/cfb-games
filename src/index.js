import React from 'react';
import ReactDOM from 'react-dom';
import GameList from './components/GameList'
import Selections from './components/Selections'
import getGames from './lib/get-games'
import 'bootstrap/dist/css/bootstrap.min.css';

// getGames().then(allGames => {
//     console.log(allGames);
//     ReactDOM.render(<GameList allGames={allGames}/>, document.getElementById('root'));
// });

ReactDOM.render(<Selections/>, document.getElementById('root'));
