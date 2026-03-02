
import React, { useState, useEffect, useReducer, useCallback, useRef } from 'react';
import { GameState, Player, Question, Location, User, AppView, Trail } from './types';
import { generateId, calculateDistance } from './utils';
import { strings } from './i18n';
import { gameReducer } from './gameReducer';
import { useGameSync, GameSyncMessage } from './useGameSync';
import { useTrails } from './hooks/useTrails';
import QuizCreator from './components/QuizCreator';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Home from './components/Home';
import JoinGame from './components/JoinGame';
import { PermissionModal } from './components/PermissionGate';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('HOME');
  const [user, setUser] = useState<User | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [editingTrail, setEditingTrail] = useState<Trail | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null); 
  const [isJoining, setIsJoining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Use a ref for sendAction to break the circular dependency with handleExitGame
  const sendActionRef = useRef<((action: GameSyncMessage) => void) | null>(null);
  const joinTimeoutRef = useRef<number | null>(null);
  const prevStatusRef = useRef<GameState['status'] | null>(null);
  const prevIndexRef = useRef<number>(-1);

  const { trails, saveTrail, deleteTrail, isLoading: isTrailsLoading } = useTrails(user);
  const [gameState, dispatch] = useReducer(gameReducer, null);

  // Sync view with game status (for both host and players)
  useEffect(() => {
    if (!gameState) return;
    const isInGameView = view === 'PLAYING';
    const shouldBeInGameView = ['PLAYING', 'RESULTS', 'SCOREBOARD', 'COUNTDOWN', 'FINISHED'].includes(gameState.status);
    
    if (shouldBeInGameView && !isInGameView && (view === 'LOBBY' || view === 'JOIN')) {
      setView('PLAYING');
    }
  }, [gameState?.status, view]);

  // handleExitGame is defined here and uses sendActionRef to avoid "used before declaration" error
  const handleExitGame = useCallback((silent = false) => {
    // 1. Snapshot the player identity before clearing
    const pId = currentPlayer?.id;
    const wasHost = isHost;

    // 2. Clear state immediately to stop watchers and callbacks
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    setCurrentPlayer(null);
    setIsJoining(false);
    setJoinCode(null);
    dispatch({ type: 'EXIT_GAME' });

    // 3. Notify the network via the ref
    if (wasHost) {
      localStorage.removeItem('locateit_active_host_state');
      sendActionRef.current?.({ type: 'TERMINATE_SESSION' });
    } else if (pId && !silent) {
      sendActionRef.current?.({ type: 'PLAYER_LEAVE', playerId: pId });
    }
    
    // 4. Update view
    setView(wasHost ? 'DASHBOARD' : 'HOME');
  }, [isHost, currentPlayer]);

  const { broadcast, sendAction, requestSync, clearCache } = useGameSync(
    useCallback((state) => dispatch({ type: 'SYNC_STATE', payload: state }), []),
    useCallback((action) => dispatch(action), []),
    isHost,
    gameState,
    joinCode,
    useCallback((targetId: string) => {
      // Targeted Kick: only alert if WE are the target
      if (currentPlayer && targetId === currentPlayer.id) {
        alert(strings.lobby.kickedDesc);
        handleExitGame(true);
      }
    }, [currentPlayer?.id, handleExitGame]),
    useCallback(() => {
      // Session Ended: Host disconnected explicitly
      handleExitGame(true);
    }, [handleExitGame])
  );

  // Sync the sendAction function to our ref for handleExitGame to use
  useEffect(() => {
    sendActionRef.current = sendAction;
  }, [sendAction]);

  // Handle Join Deep Link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('join');
    if (codeFromUrl) {
      const cleanCode = codeFromUrl.trim().toUpperCase();
      setJoinCode(cleanCode);
      setView('JOIN');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Host: Broadcast changes
  useEffect(() => {
    if (isHost && gameState) {
      // Accidental refresh protection: save host state to local storage
      localStorage.setItem('locateit_active_host_state', JSON.stringify(gameState));
      
      const isStatusChange = gameState.status !== prevStatusRef.current;
      const isIndexChange = gameState.currentQuestionIndex !== prevIndexRef.current;
      const isNewGame = prevStatusRef.current === null;
      const needsFullSync = isStatusChange || isIndexChange || isNewGame;
      
      broadcast(gameState, needsFullSync);
      
      prevStatusRef.current = gameState.status;
      prevIndexRef.current = gameState.currentQuestionIndex;
    }
  }, [gameState, isHost, broadcast]);

  // Player: Sync loop when waiting for game data
  useEffect(() => {
    if ((view === 'JOIN' || view === 'LOBBY') && !isHost && joinCode) {
      const interval = setInterval(requestSync, 4000);
      return () => clearInterval(interval);
    }
  }, [view, isHost, requestSync, joinCode]);

  // Join Watchdog (Purely for the spinner)
  useEffect(() => {
    if (gameState && currentPlayer && !isHost && isJoining) {
      const isPresent = gameState.players.some(p => p.id === currentPlayer.id);
      if (isPresent) {
        setIsJoining(false);
        if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
      }
    }
  }, [gameState?.players, currentPlayer, isHost, isJoining]);

  useEffect(() => {
    const savedUser = localStorage.getItem('locateit_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleCompleteTrail = async (questions: Question[], name: string, startingView?: { center: Location, zoom: number }) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await saveTrail(questions, name, startingView, editingTrail?.id);
      if (result.success) {
        setEditingTrail(null);
        setView('DASHBOARD');
      } else {
        alert(`Save Failed: ${result.error}.`);
      }
    } catch (e: any) {
      alert(`Unexpected Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleHostTrail = (trail: Trail) => {
    if (!user) return;
    setIsHost(true);
    setCurrentPlayer(null); 
    const newGameId = generateId();
    dispatch({ type: 'INIT_LOBBY', payload: { id: newGameId, questions: trail.questions, hostId: user.id, startingView: trail.startingView } });
    setJoinCode(newGameId);
    setView('LOBBY');
  };

  const handleResumeHost = () => {
    const saved = localStorage.getItem('locateit_active_host_state');
    if (saved) {
      const state = JSON.parse(saved) as GameState;
      setIsHost(true);
      setCurrentPlayer(null);
      setJoinCode(state.id);
      dispatch({ type: 'SYNC_STATE', payload: state });
      setView(state.status === 'LOBBY' ? 'LOBBY' : 'PLAYING');
    }
  };

  const handleJoinGame = (gameCode: string, name: string, color: string) => {
    setJoinError(null);
    const code = gameCode.trim().toUpperCase();
    
    if (!gameState || gameState.id !== code) {
      setJoinError(`Searching for Expedition ${code}... Ensure the host has started the lobby.`);
      requestSync();
      return;
    }

    const savedId = localStorage.getItem('locateit_last_player_id');
    const existingById = gameState.players.find(p => p.id === savedId);
    
    if (existingById) {
      setCurrentPlayer(existingById);
      setIsJoining(false);
      setIsHost(false);
      setView(gameState.status === 'LOBBY' ? 'LOBBY' : 'PLAYING');
      return;
    }

    const newPlayer: Player = { id: generateId(), name, color, score: 0, hasGuessed: false };
    setCurrentPlayer(newPlayer);
    setIsHost(false);
    setIsJoining(true);
    
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    joinTimeoutRef.current = window.setTimeout(() => setIsJoining(false), 20000);
    
    localStorage.setItem('locateit_last_player_id', newPlayer.id);
    sendAction({ type: 'PLAYER_JOIN_REQUEST', player: newPlayer });
    setView('LOBBY');
  };

  return (
    <>
      {showPermissionModal && <PermissionModal onClose={() => setShowPermissionModal(false)} />}
      {view === 'HOME' && <Home onJoin={() => setView('JOIN')} onDesign={() => user ? setView('DASHBOARD') : setView('AUTH')} />}
      {view === 'JOIN' && <JoinGame prefilledCode={joinCode || ''} onBack={() => setView('HOME')} onJoin={handleJoinGame} onCodeChange={setJoinCode} isSearching={!gameState && !!joinCode} error={joinError} />}
      {view === 'AUTH' && <Auth onAuthSuccess={(u) => { setUser(u); setView('DASHBOARD'); }} onBack={() => setView('HOME')} />}
      {view === 'DASHBOARD' && user && (
        <Dashboard 
          user={user} 
          trails={trails}
          isLoading={isTrailsLoading}
          onNewTrail={() => { setEditingTrail(null); setView('CREATE'); }} 
          onEditTrail={(t) => { setEditingTrail(t); setView('CREATE'); }} 
          onHostTrail={handleHostTrail} 
          onDeleteTrail={deleteTrail}
          onLogout={() => { localStorage.removeItem('locateit_user'); setUser(null); setView('HOME'); }}
          onResumeHost={localStorage.getItem('locateit_active_host_state') ? handleResumeHost : undefined}
        />
      )}
      {view === 'CREATE' && (
        <QuizCreator 
          initialTrail={editingTrail || undefined} 
          onComplete={handleCompleteTrail} 
          onCancel={() => setView('DASHBOARD')} 
          onRequestPermissions={() => setShowPermissionModal(true)}
          isSaving={isSaving}
        />
      )}
      {view === 'LOBBY' && gameState && (
        <Lobby 
          gameState={gameState} 
          isHost={isHost} 
          onStart={() => dispatch({ type: 'SET_STATUS', payload: 'PLAYING' })} 
          currentPlayer={currentPlayer} 
          onBack={() => handleExitGame()} 
          onKick={(id) => {
            sendAction({ type: 'PLAYER_KICKED', targetId: id });
            dispatch({ type: 'KICK_PLAYER', payload: id });
          }} 
        />
      )}
      {view === 'PLAYING' && gameState && (
        <GameBoard 
          gameState={gameState} 
          isHost={isHost} 
          currentPlayer={currentPlayer} 
          onGuess={(guess) => {
            if (!currentPlayer) return;
            const currentQ = gameState.questions[gameState.currentQuestionIndex];
            const dist = calculateDistance(guess, currentQ.location);
            sendAction({ type: 'PLAYER_GUESS_REQUEST', playerId: currentPlayer.id, guess, distance: dist });
            if (isHost) dispatch({ type: 'SUBMIT_GUESS', payload: { playerId: currentPlayer.id, guess, distance: dist } });
          }} 
          onUnlock={() => {
            if (!currentPlayer) return;
            sendAction({ type: 'PLAYER_UNLOCK_REQUEST', playerId: currentPlayer.id });
            if (isHost) dispatch({ type: 'UNLOCK_GUESS', payload: currentPlayer.id });
          }}
          onReveal={() => {
            if (!isHost) return;
            dispatch({ type: 'SET_STATUS', payload: 'COUNTDOWN' });
            sendAction({ type: 'HOST_REVEAL_REQUEST' });
          }}
          onForceReveal={() => {
            if (!isHost) return;
            dispatch({ type: 'FORCE_REVEAL' });
            sendAction({ type: 'FORCE_REVEAL' });
          }}
          onCountdownFinish={() => isHost && dispatch({ type: 'SET_STATUS', payload: 'RESULTS' })}
          onShowScoreboard={() => isHost && dispatch({ type: 'CALCULATE_SCORES' })}
          onNext={() => isHost && dispatch({ type: 'NEXT_ROUND' })} 
          onExit={() => handleExitGame()}
        />
      )}
    </>
  );
};

export default App;
