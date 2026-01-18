'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Plus, Building2, FileText, Settings, LogOut, FolderOpen, Calendar, MoreVertical, Trash2, Search, X, Filter, MapPin } from 'lucide-react';

// Dynamically import components to avoid SSR issues
const ProjectsMap = dynamic(
  () => import('@/components/dashboard/ProjectsMap').then((mod) => ({ default: mod.ProjectsMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400">
        Loading map...
      </div>
    )
  }
);

const DataResourcesMap = dynamic(
  () => import('@/components/dashboard/DataResourcesMap').then((mod) => ({ default: mod.DataResourcesMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400">
        Loading map...
      </div>
    )
  }
);

const LocationMapSelectorWrapper = dynamic(
  () => import('@/components/cad/LocationMapSelector').then((mod) => mod.LocationMapSelector),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400">
        Loading map...
      </div>
    )
  }
);

import { ProjectsList } from '@/components/dashboard/ProjectsList';
import { QuickAccessPanel } from '@/components/dashboard/QuickAccessPanel';
import { ResourcesList } from '@/components/dashboard/ResourcesList';
import type { DataResource } from '@/types/data-resources';

interface Project {
  id: string;
  name: string;
  description?: string;
  project_type?: string;
  updated_at: string;
  center_lat?: number | null;
  center_lon?: number | null;
}

type DashboardTab = 'projects' | 'data';

// Mock data resources for testing
function getMockDataResources(): DataResource[] {
  return [
    {
      id: 'dem-copernicus-biobio',
      name: 'Copernicus DEM - Región del Biobío',
      description: 'Digital Elevation Model from Copernicus covering Biobío region',
      type: 'dem',
      provider: 'copernicus',
      bounds: {
        south: -38.0,
        north: -36.0,
        west: -73.5,
        east: -71.5,
      },
      center_lat: -37.0,
      center_lon: -72.5,
      format: 'GeoTIFF',
      resolution: '30m',
      coverage_area: 'Región del Biobío',
      access_type: 'public',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      tags: ['terrain', 'elevation', 'topography'],
    },
    {
      id: 'imagery-sentinel-concepcion',
      name: 'Sentinel-2 Imagery - Concepción',
      description: 'Recent Sentinel-2 satellite imagery covering Concepción metropolitan area',
      type: 'imagery',
      provider: 'copernicus',
      center_lat: -36.8201,
      center_lon: -73.0444,
      bounds: {
        south: -37.0,
        north: -36.6,
        west: -73.3,
        east: -72.8,
      },
      format: 'COG',
      resolution: '10m',
      coverage_area: 'Concepción',
      access_type: 'public',
      created_at: '2024-03-10T14:30:00Z',
      updated_at: '2024-03-10T14:30:00Z',
      tags: ['satellite', 'multispectral', 'optical'],
    },
    {
      id: 'api-dga-caudales',
      name: 'DGA - API de Caudales',
      description: 'Dirección General de Aguas real-time river flow data API',
      type: 'api',
      provider: 'dga',
      center_lat: -36.7,
      center_lon: -72.5,
      format: 'JSON',
      access_type: 'api_key',
      url: 'https://dga.mop.gob.cl/services/caudales',
      coverage_area: 'Chile',
      created_at: '2023-11-20T09:00:00Z',
      updated_at: '2024-03-15T16:45:00Z',
      tags: ['hydrology', 'rivers', 'real-time'],
    },
    {
      id: 'service-ide-chile',
      name: 'IDE Chile - WMS Base Maps',
      description: 'Chilean Spatial Data Infrastructure Web Map Service',
      type: 'service',
      provider: 'custom',
      format: 'WMS',
      access_type: 'public',
      url: 'https://www.ide.cl/geoserver/wms',
      coverage_area: 'Chile',
      created_at: '2023-06-10T11:00:00Z',
      updated_at: '2024-02-28T13:20:00Z',
      tags: ['cadastre', 'basemap', 'reference'],
    },
    {
      id: 'weather-dmc-nuble',
      name: 'DMC - Estaciones Meteorológicas Ñuble',
      description: 'Weather station data from Chilean Meteorological Service',
      type: 'weather',
      provider: 'dmc',
      center_lat: -36.6,
      center_lon: -72.1,
      format: 'JSON',
      access_type: 'public',
      coverage_area: 'Región de Ñuble',
      created_at: '2023-08-05T08:15:00Z',
      updated_at: '2024-03-16T07:30:00Z',
      tags: ['meteorology', 'precipitation', 'temperature'],
    },
    {
      id: 'dem-opentopo-andes',
      name: 'OpenTopography - Andes High Resolution',
      description: 'High-resolution DEM of Andes mountain range',
      type: 'dem',
      provider: 'opentopography',
      bounds: {
        south: -37.5,
        north: -36.0,
        west: -72.0,
        east: -71.0,
      },
      center_lat: -36.75,
      center_lon: -71.5,
      format: 'GeoTIFF',
      resolution: '10m',
      coverage_area: 'Cordillera de los Andes',
      access_type: 'public',
      created_at: '2024-02-01T12:00:00Z',
      updated_at: '2024-02-01T12:00:00Z',
      tags: ['lidar', 'high-resolution', 'mountains'],
    },
  ];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dataResources, setDataResources] = useState<DataResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ projectId: string; projectName: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<DashboardTab>('projects');

  useEffect(() => {
    // Check auth via API (supports both cookie and localStorage auth)
    async function checkAuth() {
      try {
        // First try API auth (cookie-based from OAuth)
        const meResponse = await fetch('/api/auth/me');
        if (meResponse.ok) {
          const userData = await meResponse.json();
          setUser(userData.user);
          loadProjects();
          loadDataResources();
          return;
        }

        // Fall back to localStorage auth (legacy)
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!storedUser || !token) {
          router.push('/auth/signin');
          return;
        }

        setUser(JSON.parse(storedUser));
        loadProjects();
        loadDataResources();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/signin');
      }
    }

    checkAuth();
  }, [router]);

  async function loadProjects() {
    try {
      // Load all projects from unified API (cookie auth sent automatically)
      const response = await fetch('/api/projects', {
        credentials: 'include',
      });

      const data = await response.json();

      const allProjects: Project[] = data.projects || [];

      // Sort by updated_at
      allProjects.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setProjects(allProjects);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setIsLoading(false);
    }
  }

  async function loadDataResources() {
    try {
      const response = await fetch('/api/data-resources', {
        credentials: 'include',
      });

      if (!response.ok) {
        // If endpoint doesn't exist yet, use mock data
        console.log('Data resources endpoint not available, using mock data');
        setDataResources(getMockDataResources());
        return;
      }

      const data = await response.json();
      setDataResources(data.resources || []);
    } catch (error) {
      console.error('Failed to load data resources:', error);
      // Use mock data if API fails
      setDataResources(getMockDataResources());
    }
  }

  async function handleLogout() {
    // Clear localStorage (legacy)
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // Call logout API to clear cookie
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/');
  }

  async function handleDeleteProject() {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      const endpoint = `/api/projects/${deleteConfirm.projectId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Refresh project list
      loadProjects();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  // Filter and search projects
  const filteredProjects = projects.filter((project) => {
    // Search by name or description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesName = project.name.toLowerCase().includes(query);
      const matchesDescription = project.description?.toLowerCase().includes(query);
      return matchesName || matchesDescription;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">LeDesign</h1>
            <div className="flex items-center gap-4">
              <span className="text-slate-300">{user?.name || user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col h-[calc(100vh-80px)] container mx-auto px-4 py-6">
        {/* Header with title and actions - Fixed size */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Dashboard</h2>
            <p className="text-slate-400 text-sm">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-64 pl-9 pr-9 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowNewProjectModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              New Project
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4 flex-shrink-0 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'projects'
                ? 'text-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Projects
            {activeTab === 'projects' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'data'
                ? 'text-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Data & Resources
            {activeTab === 'data' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'projects' && (
          /* 2x2 Grid Layout - Fills remaining space */
          <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Top row - 2 columns - Expands to fill remaining space */}
          <div className="flex-1 grid grid-cols-[2fr_1fr] gap-4 min-h-0">
            <div className="min-h-0 min-w-0 flex">
              {/* Projects Map - Takes 2/3 width */}
              <ProjectsMap
                projects={filteredProjects}
                userAddress={user?.address ? { lat: user.address.lat, lon: user.address.lon } : undefined}
                onProjectClick={(projectId) => {
                  // All projects use the unified editor with access to all modules
                  router.push(`/projects/${projectId}`);
                }}
              />
            </div>

            <div className="min-h-0 min-w-0 flex">
              {/* Projects List - Takes 1/3 width */}
              <ProjectsList
                projects={filteredProjects}
                onDelete={(projectId, projectName) => {
                  setDeleteConfirm({ projectId, projectName });
                }}
              />
            </div>
          </div>

          {/* Bottom row - spans full width - Fits content size */}
          <div className="flex-shrink-0">
            {/* Quick Access Panel */}
            <QuickAccessPanel
              recentProjectId={projects[0]?.id}
            />
          </div>
          </div>
        )}

        {/* Data & Resources Tab */}
        {activeTab === 'data' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Top row - Map (2/3) and Resources List (1/3) */}
            <div className="flex-1 grid grid-cols-[2fr_1fr] gap-4 min-h-0">
              <div className="min-h-0 min-w-0 flex">
                {/* Data Resources Map */}
                <DataResourcesMap
                  resources={dataResources}
                  onResourceClick={(resourceId) => {
                    console.log('Resource clicked:', resourceId);
                    // TODO: Show resource details modal
                  }}
                />
              </div>

              <div className="min-h-0 min-w-0 flex">
                {/* Resources List */}
                <ResourcesList
                  resources={dataResources}
                  onResourceClick={(resourceId) => {
                    console.log('Resource clicked:', resourceId);
                    // TODO: Show resource details modal or highlight on map
                  }}
                />
              </div>
            </div>

            {/* Bottom row - Resource filters and stats */}
            <div className="flex-shrink-0">
              <div className="bg-slate-800/30 rounded-lg border border-slate-700 p-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {dataResources.filter(r => r.type === 'dem').length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">DEMs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {dataResources.filter(r => r.type === 'imagery').length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Imagery</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      {dataResources.filter(r => r.type === 'api').length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">APIs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cyan-400">
                      {dataResources.filter(r => r.type === 'weather' || r.type === 'sensor').length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Real-time Data</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onSuccess={() => {
            setShowNewProjectModal(false);
            const token = localStorage.getItem('token');
            if (token) loadProjects(token);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Delete Project</h2>
            </div>

            <p className="text-slate-300 mb-2">
              Are you sure you want to delete <strong>{deleteConfirm.projectName}</strong>?
            </p>
            <p className="text-slate-400 text-sm mb-6">
              This action cannot be undone. All project data will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NewProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function NewProjectModal({ onClose, onSuccess }: NewProjectModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'location'>('details');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [setLocation, setSetLocation] = useState(false);
  const [location, setLocationData] = useState<{
    center_lat: number | null;
    center_lon: number | null;
    bounds_south: number | null;
    bounds_north: number | null;
    bounds_west: number | null;
    bounds_east: number | null;
  }>({
    center_lat: null,
    center_lon: null,
    bounds_south: null,
    bounds_north: null,
    bounds_west: null,
    bounds_east: null,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      // All projects are now civil projects with full access to all modules
      const endpoint = '/api/projects';

      // Include location data if set
      const projectData: any = { name, description };
      if (setLocation && location.center_lat && location.center_lon) {
        projectData.center_lat = location.center_lat;
        projectData.center_lon = location.center_lon;
        projectData.bounds_south = location.bounds_south;
        projectData.bounds_north = location.bounds_north;
        projectData.bounds_west = location.bounds_west;
        projectData.bounds_east = location.bounds_east;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create project');
        setIsCreating(false);
        return;
      }

      // Redirect to the civil editor
      const projectId = data.project?.id;
      if (projectId) {
        router.push(`/projects/${projectId}`);
      } else {
        onSuccess();
      }
    } catch (err) {
      setError('An error occurred');
      setIsCreating(false);
    }
  }

  function handleNext() {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    setError('');
    setStep('location');
  }

  function handleSkipLocation() {
    setSetLocation(false);
    handleCreate();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">New Project</h2>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className={step === 'details' ? 'text-blue-400 font-medium' : ''}>1. Details</span>
            <span>→</span>
            <span className={step === 'location' ? 'text-blue-400 font-medium' : ''}>2. Location</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 'details' ? (
          <>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                  Project Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md focus:outline-none focus:border-blue-500 text-white"
                  placeholder="My Project"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md focus:outline-none focus:border-blue-500 text-white resize-none"
                  rows={3}
                  placeholder="Brief description of the project"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3 text-sm text-blue-300">
                All modules (Civil, Structural, Water, Roads, Terrain) are included by default.
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Next: Set Location
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-300 mb-3">
                  Would you like to set a geographic location for this project? This helps with site-specific data and georeferencing.
                </p>

                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setSetLocation(true)}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      setLocation
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <MapPin size={20} className="mx-auto mb-1 text-blue-400" />
                    <div className="text-white text-sm font-medium">Set Location</div>
                  </button>
                  <button
                    onClick={() => setSetLocation(false)}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      !setLocation
                        ? 'border-slate-500 bg-slate-700/30'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <FileText size={20} className="mx-auto mb-1 text-slate-400" />
                    <div className="text-white text-sm font-medium">Skip for Now</div>
                  </button>
                </div>

                {setLocation && (
                  <LocationMapSelectorWrapper
                    center={
                      location.center_lat && location.center_lon
                        ? { lat: location.center_lat, lon: location.center_lon }
                        : null
                    }
                    bounds={
                      location.bounds_south &&
                      location.bounds_north &&
                      location.bounds_west &&
                      location.bounds_east
                        ? {
                            south: location.bounds_south,
                            north: location.bounds_north,
                            west: location.bounds_west,
                            east: location.bounds_east,
                          }
                        : null
                    }
                    onLocationChange={(loc) => {
                      setLocationData({
                        ...location,
                        center_lat: loc.lat,
                        center_lon: loc.lon,
                      });
                    }}
                    onBoundsChange={(bounds) => {
                      setLocationData({
                        ...location,
                        bounds_south: bounds.south,
                        bounds_north: bounds.north,
                        bounds_west: bounds.west,
                        bounds_east: bounds.east,
                      });
                    }}
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('details')}
                disabled={isCreating}
                className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleSkipLocation}
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors disabled:opacity-50"
              >
                Skip & Create
              </button>
              <button
                onClick={() => {
                  setSetLocation(true);
                  handleCreate();
                }}
                disabled={isCreating || !location.center_lat || !location.center_lon}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create with Location'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
