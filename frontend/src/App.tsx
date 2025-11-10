import { useState, useEffect } from 'react';
import { authApi, queueApi } from './api';
import { QueueEntry, QueueStatus } from './types';
import { connectQueue } from './ws';
import AnimatedMath from './AnimatedMath';

function App() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(authApi.isLoggedIn());
  const [loginState, setLoginState] = useState({ username: '', password: '' });
  const [lastEstimate, setLastEstimate] = useState<number | null>(null);
  const [optOverlay, setOptOverlay] = useState<{ open: boolean; result: any | null }>({ open: false, result: null });
  const [formData, setFormData] = useState({
    name: '',
    party_size: 2,
    phone_number: '',
  });

  // Fetch queue data
  const fetchQueue = async () => {
    try {
      setError(null);
      const data = await queueApi.getAll();
      // Sort by joined_at, with waiting status first
      const sorted = data.sort((a, b) => {
        if (a.status === 'waiting' && b.status !== 'waiting') return -1;
        if (a.status !== 'waiting' && b.status === 'waiting') return 1;
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
      });
      // Compute estimated wait time for waiting entries
      const waiting = sorted.filter((e) => e.status === 'waiting');
      const averageMinutesPerParty = 10; // basic algorithm: 10 minutes per party ahead
      const withEstimates = sorted.map((entry) => {
        if (entry.status !== 'waiting') return entry;
        const position = waiting.findIndex((w) => w.id === entry.id);
        const estimated_wait_minutes = Math.max(0, position) * averageMinutesPerParty;
        return { ...entry, estimated_wait_minutes };
      });
      setQueue(withEstimates);
    } catch (err) {
      setError('Failed to fetch queue. Make sure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch and poll only when admin
  useEffect(() => {
    if (!isAdmin) {
      setQueue([]);
      setLoading(false);
      return;
    }
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    // Subscribe to websocket push updates to refresh faster and reduce waiting
    const disconnect = connectQueue(() => {
      // On any server event, refetch latest queue
      fetchQueue();
    });
    return () => {
      clearInterval(interval);
      disconnect();
    };
  }, [isAdmin]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      setError(null);
      const created = await queueApi.create({
        name: formData.name,
        party_size: formData.party_size,
        phone_number: formData.phone_number || undefined,
      });
      setFormData({ name: '', party_size: 2, phone_number: '' });
      if (typeof (created as any).estimated_wait_minutes === 'number') {
        setLastEstimate((created as any).estimated_wait_minutes);
      } else {
        setLastEstimate(null);
      }
      if (isAdmin) {
        fetchQueue();
      }
    } catch (err) {
      setError('Failed to add customer to queue');
      console.error(err);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (id: number, status: QueueStatus) => {
    try {
      setError(null);
      await queueApi.updateStatus(id, status);
      fetchQueue();
    } catch (err) {
      setError('Failed to update status');
      console.error(err);
    }
  };

  // Handle delete (admin)
  const handleDelete = async (id: number) => {
    try {
      setError(null);
      await queueApi.remove(id);
      fetchQueue();
    } catch (err) {
      setError('Failed to delete entry (admin only)');
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await authApi.login(loginState.username, loginState.password);
      setIsAdmin(true);
      setLoginState({ username: '', password: '' });
    } catch (err) {
      setError('Login failed. Check credentials.');
      console.error(err);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    setIsAdmin(false);
  };

  const waitingCount = queue.filter((q) => q.status === 'waiting').length;

  const getStatusColor = (status: QueueStatus) => {
    switch (status) {
      case 'waiting':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'seated':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'no_show':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getItemBorderColor = (status: QueueStatus) => {
    switch (status) {
      case 'waiting':
        return 'border-l-green-500';
      case 'seated':
        return 'border-l-blue-500';
      case 'no_show':
        return 'border-l-orange-500';
      case 'cancelled':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center text-white mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 drop-shadow-lg">
            Qup - Restaurant Wait List
          </h1>
          <div className="text-xl md:text-2xl font-medium opacity-90">
            {waitingCount} {waitingCount === 1 ? 'person' : 'people'} waiting
          </div>
          <div className="mt-4">
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Logout (Admin)
              </button>
            ) : (
              <details className="inline-block">
                <summary className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold transition list-none">
                  Admin Login
                </summary>
                <form onSubmit={handleLogin} className="mt-3 bg-white rounded-lg p-4 text-left w-[280px] mx-auto">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={loginState.username}
                      onChange={(e) => setLoginState({ ...loginState, username: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-black"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={loginState.password}
                      onChange={(e) => setLoginState({ ...loginState, password: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-black"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded"
                  >
                    Login
                  </button>
                </form>
              </details>
            )}
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="max-w-6xl mx-auto mb-6">
            <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg text-center font-medium">
              {error}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Customer Section */}
          <section className="bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Add Customer to Queue
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Customer name"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="party_size"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Party Size *
                </label>
                <input
                  type="number"
                  id="party_size"
                  min="1"
                  max="20"
                  value={formData.party_size}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      party_size: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="phone_number"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
              >
                Add to Queue
              </button>
            </form>
          </section>

          {/* Queue Section (Admin only); non-admin shows estimate message */}
          <section className="bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {isAdmin ? 'Current Queue' : 'Status'}
            </h2>
            {!isAdmin ? (
              <div className="text-center py-8 text-gray-700">
                {lastEstimate !== null ? (
                  <div className="inline-block bg-purple-50 border border-purple-200 text-purple-800 px-6 py-4 rounded-lg">
                    Thank you! Your estimated wait is{' '}
                    <span className="font-bold">{lastEstimate} minutes</span>.
                  </div>
                ) : (
                  <div className="inline-block bg-gray-50 border border-gray-200 text-gray-700 px-6 py-4 rounded-lg">
                    Add your name to see your estimated wait time.
                  </div>
                )}
              </div>
            ) : loading ? (
              <div className="text-center py-12 text-gray-500 text-lg">
                Loading queue...
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-lg">
                No customers in queue
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 queue-list">
                {queue.map((entry) => (
                  <div
                    key={entry.id}
                    className={`bg-gray-50 rounded-lg p-5 border-l-4 ${getItemBorderColor(
                      entry.status
                    )} ${
                      entry.status !== 'waiting' ? 'opacity-75' : ''
                    } hover:shadow-md transition-all duration-200`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold text-gray-800">
                            {entry.name}
                          </h3>
                          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                            #{entry.id}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                          <span className="font-semibold text-gray-700">
                            Party of {entry.party_size}
                          </span>
                          {entry.phone_number && (
                            <span className="text-gray-600">
                              {entry.phone_number}
                            </span>
                          )}
                          <span className="text-gray-500">
                            Joined:{' '}
                            {new Date(entry.joined_at).toLocaleTimeString()}
                          </span>
                          {entry.status === 'waiting' && typeof entry.estimated_wait_minutes === 'number' && (
                            <span className="text-gray-700 font-semibold">
                              Est. wait: {entry.estimated_wait_minutes} min
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            entry.status
                          )}`}
                        >
                          {entry.status.charAt(0).toUpperCase() +
                            entry.status.slice(1).replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {isAdmin && entry.status === 'waiting' && (
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleStatusUpdate(entry.id, 'seated')}
                          className="flex-1 bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transform hover:scale-105 transition-all duration-200"
                        >
                          Seat
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(entry.id, 'no_show')
                          }
                          className="flex-1 bg-orange-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-orange-600 transform hover:scale-105 transition-all duration-200"
                        >
                          No Show
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(entry.id, 'cancelled')
                          }
                          className="flex-1 bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transform hover:scale-105 transition-all duration-200"
                        >
                          Cancel
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="flex-1 bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-800 transform hover:scale-105 transition-all duration-200"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {isAdmin && (
                  <div className="sticky bottom-0 bg-white pt-4">
                    <button
                      onClick={async () => {
                        try {
                          const result = await queueApi.optimize();
                          setOptOverlay({ open: true, result });
                        } catch (e) {
                          console.error(e);
                          setError('Optimization failed');
                        }
                      }}
                      className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition shadow"
                    >
                      Optimize Seating (Bin Packing)
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
      {optOverlay.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[min(92vw,900px)] p-6 relative overflow-hidden">
            <button
              onClick={() => setOptOverlay({ open: false, result: null })}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Queue Optimized</h3>
            <p className="text-gray-600 mb-4">
              First‑Fit Decreasing with Best‑Fit selection to minimize wasted seats.
            </p>
            {/* Animated math/graph visualization */}
            <div className="relative h-56 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl overflow-hidden mb-4">
              <AnimatedMath />
            </div>
            {/* Compact, static worked example (no scrolling needed) */}
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="font-semibold text-indigo-900 mb-2">How the math works (example)</div>
              <div className="text-sm text-indigo-900/90 space-y-2">
                <p>
                  Objective: minimize total wasted seats
                  {' '}<span className="font-mono">Σ (capacity - size)</span>.
                </p>
                <p className="font-mono bg-white rounded px-2 py-1 inline-block">
                  Tables = [2, 4, 4, 6], Parties = [5, 4, 3, 2]
                </p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>5 → choose 6 → waste = 1</li>
                  <li>4 → choose 4 → waste = 0</li>
                  <li>3 → choose 4 → waste = 1</li>
                  <li>2 → choose 2 → waste = 0</li>
                </ol>
                <p className="mt-1">
                  Total wasted seats = <span className="font-semibold">2</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
