import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { StartWorkoutScreen } from './screens/StartWorkoutScreen';
import { ActiveWorkoutScreen } from './screens/ActiveWorkoutScreen';
import { WorkoutSummaryScreen } from './screens/WorkoutSummaryScreen';
import { MetricsScreen } from './screens/MetricsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { LoginScreen } from './screens/LoginScreen';
import { UnitProvider } from './context/UnitContext';
import { setTokenGetter } from './api/client';

type Screen =
  | { name: 'start' }
  | { name: 'active'; workoutId: string }
  | { name: 'summary'; workoutId: string }
  | { name: 'metrics' }
  | { name: 'profile' };

export default function App() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'start' });

  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <p className="font-label text-sm uppercase tracking-widest text-secondary/60 animate-pulse">
          Loading…
        </p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <LoginScreen />;
  }

  return (
    <UnitProvider>
      {screen.name === 'active' && (
        <ActiveWorkoutScreen
          workoutId={screen.workoutId}
          onBack={() => setScreen({ name: 'start' })}
          onFinished={(id) => setScreen({ name: 'summary', workoutId: id })}
        />
      )}
      {screen.name === 'summary' && (
        <WorkoutSummaryScreen
          workoutId={screen.workoutId}
          onContinue={() => setScreen({ name: 'start' })}
        />
      )}
      {screen.name === 'metrics' && (
        <MetricsScreen
          onNavigateStart={() => setScreen({ name: 'start' })}
          onNavigateProfile={() => setScreen({ name: 'profile' })}
        />
      )}
      {screen.name === 'profile' && (
        <ProfileScreen
          onNavigateStart={() => setScreen({ name: 'start' })}
          onNavigateMetrics={() => setScreen({ name: 'metrics' })}
        />
      )}
      {screen.name === 'start' && (
        <StartWorkoutScreen
          onOpenWorkout={(id) => setScreen({ name: 'active', workoutId: id })}
          onNavigateMetrics={() => setScreen({ name: 'metrics' })}
          onNavigateProfile={() => setScreen({ name: 'profile' })}
        />
      )}
    </UnitProvider>
  );
}
