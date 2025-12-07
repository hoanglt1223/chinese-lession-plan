import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Play,
  Pause,
  Square,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Settings,
  BarChart3
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CronJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  schedule: string;
  lastRun: string | null;
  nextRun: string | null;
  totalLessons: number;
  processedLessons: number;
  failedLessons: number;
  options: {
    skipExisting: boolean;
    skipFlashcards: boolean;
    maxConcurrent: number;
    retryFailures: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  unitNumber: string | number;
  lessonNumber: string | number;
  lessonTitle: string;
  progress: number;
  error?: string;
  startTime: string;
  endTime?: string;
  retryCount: number;
}

export default function CronjobManager() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [jobStatuses, setJobStatuses] = useState<JobStatus[]>([]);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newJobName, setNewJobName] = useState('');
  const [newJobSchedule, setNewJobSchedule] = useState('0 * * * *');
  const [newJobOptions, setNewJobOptions] = useState({
    skipExisting: true,
    skipFlashcards: false,
    maxConcurrent: 3,
    retryFailures: true
  });

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/cronjob?action=jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch cron jobs",
        variant: "destructive"
      });
    }
  };

  const fetchJobStatuses = async () => {
    try {
      const response = await fetch('/api/cronjob?action=statuses');
      if (!response.ok) throw new Error('Failed to fetch job statuses');
      const data = await response.json();
      setJobStatuses(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch job statuses",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchJobs(), fetchJobStatuses()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Auto-refresh for running jobs
  useEffect(() => {
    const interval = setInterval(() => {
      const hasRunningJobs = jobs.some(job => job.status === 'running');
      if (hasRunningJobs) {
        Promise.all([fetchJobs(), fetchJobStatuses()]);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [jobs]);

  const runJob = async (jobId: string) => {
    try {
      const response = await fetch('/api/cronjob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', jobId })
      });

      if (!response.ok) throw new Error('Failed to run job');

      toast({
        title: "Success",
        description: "Job started successfully"
      });

      await fetchJobs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start job",
        variant: "destructive"
      });
    }
  };

  const pauseJob = async (jobId: string) => {
    try {
      const response = await fetch('/api/cronjob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause', jobId })
      });

      if (!response.ok) throw new Error('Failed to pause job');

      toast({
        title: "Success",
        description: "Job paused successfully"
      });

      await fetchJobs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause job",
        variant: "destructive"
      });
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/cronjob?action=delete&jobId=${jobId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete job');

      toast({
        title: "Success",
        description: "Job deleted successfully"
      });

      await fetchJobs();
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive"
      });
    }
  };

  const createJob = async () => {
    if (!newJobName.trim()) {
      toast({
        title: "Error",
        description: "Job name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/cronjob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newJobName,
          schedule: newJobSchedule,
          options: newJobOptions
        })
      });

      if (!response.ok) throw new Error('Failed to create job');

      toast({
        title: "Success",
        description: "Job created successfully"
      });

      setShowCreateDialog(false);
      setNewJobName('');
      setNewJobSchedule('0 * * * *');
      setNewJobOptions({
        skipExisting: true,
        skipFlashcards: false,
        maxConcurrent: 3,
        retryFailures: true
      });

      await fetchJobs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'running': return 'default';
      case 'completed': return 'secondary';
      case 'failed': return 'destructive';
      case 'paused': return 'outline';
      default: return 'outline';
    }
  };

  const getJobProgress = (job: CronJob) => {
    if (job.totalLessons === 0) return 0;
    return (job.processedLessons / job.totalLessons) * 100;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cronjob Manager</h1>
          <p className="text-muted-foreground">Manage and monitor automated lesson generation jobs</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Cron Job</DialogTitle>
              <DialogDescription>
                Configure a new automated lesson generation job
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Job Name
                </Label>
                <Input
                  id="name"
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Daily Lesson Generation"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="schedule" className="text-right">
                  Schedule
                </Label>
                <Input
                  id="schedule"
                  value={newJobSchedule}
                  onChange={(e) => setNewJobSchedule(e.target.value)}
                  className="col-span-3"
                  placeholder="0 * * * * (every hour)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="maxConcurrent" className="text-right">
                  Max Concurrent
                </Label>
                <Input
                  id="maxConcurrent"
                  type="number"
                  value={newJobOptions.maxConcurrent}
                  onChange={(e) => setNewJobOptions(prev => ({
                    ...prev,
                    maxConcurrent: parseInt(e.target.value) || 3
                  }))}
                  className="col-span-3"
                  min="1"
                  max="10"
                />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="skipExisting"
                    checked={newJobOptions.skipExisting}
                    onCheckedChange={(checked) => setNewJobOptions(prev => ({
                      ...prev,
                      skipExisting: checked
                    }))}
                  />
                  <Label htmlFor="skipExisting">Skip Existing Lessons</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="skipFlashcards"
                    checked={newJobOptions.skipFlashcards}
                    onCheckedChange={(checked) => setNewJobOptions(prev => ({
                      ...prev,
                      skipFlashcards: checked
                    }))}
                  />
                  <Label htmlFor="skipFlashcards">Skip Flashcards</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createJob}>Create Job</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="statuses">Lesson Status</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <div className="grid gap-4">
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No cron jobs created yet</p>
                    <p className="text-sm text-muted-foreground">Create your first job to get started</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              jobs.map((job) => (
                <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedJob(job)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <CardTitle className="text-lg">{job.name}</CardTitle>
                          <CardDescription>Schedule: {job.schedule}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusBadgeVariant(job.status)}>
                          {job.status}
                        </Badge>
                        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                          {job.status === 'running' ? (
                            <Button size="sm" variant="outline" onClick={() => pauseJob(job.id)}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : job.status !== 'completed' && job.status !== 'failed' ? (
                            <Button size="sm" variant="outline" onClick={() => runJob(job.id)}>
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the job "{job.name}" and all its status history.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteJob(job.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{job.processedLessons} / {job.totalLessons} lessons</span>
                      </div>
                      <Progress value={getJobProgress(job)} />
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{job.processedLessons} completed</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span>{job.failedLessons} failed</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Settings className="h-4 w-4 text-gray-500" />
                          <span>{job.options.maxConcurrent} concurrent</span>
                        </div>
                      </div>
                      {job.lastRun && (
                        <div className="text-sm text-muted-foreground">
                          Last run: {new Date(job.lastRun).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="statuses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Generation Status</CardTitle>
              <CardDescription>
                Real-time status of individual lesson generation tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {jobStatuses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No lesson statuses available
                    </div>
                  ) : (
                    jobStatuses.map((status, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(status.status)}
                          <div>
                            <p className="font-medium">
                              Unit {status.unitNumber} - Lesson {status.lessonNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">{status.lessonTitle}</p>
                            {status.error && (
                              <p className="text-sm text-red-500">{status.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusBadgeVariant(status.status)}>
                            {status.status}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-1">
                            {status.progress}% complete
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Running Jobs</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {jobs.filter(job => job.status === 'running').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {jobs.reduce((sum, job) => sum + job.totalLessons, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {jobs.reduce((sum, job) => sum + job.processedLessons, 0) > 0
                    ? Math.round((jobs.reduce((sum, job) => sum + job.processedLessons, 0) /
                       jobs.reduce((sum, job) => sum + job.totalLessons, 0)) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}