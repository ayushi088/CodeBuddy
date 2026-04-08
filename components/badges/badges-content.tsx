"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BADGES, LEVELS, getLevelFromPoints } from "@/lib/gamification-shared"
import { useAuth } from "@/lib/auth-context"
import useSWR from "swr"
import {
  Clock,
  BookOpen,
  Trophy,
  Award,
  Flame,
  Star,
  Zap,
  Target,
  Eye,
  Play,
  Calendar,
  Repeat,
  Medal,
  Coins,
  Gem,
  Crown,
  Lock,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const iconMap: Record<string, React.ReactNode> = {
  Clock: <Clock className="h-6 w-6" />,
  BookOpen: <BookOpen className="h-6 w-6" />,
  Trophy: <Trophy className="h-6 w-6" />,
  Award: <Award className="h-6 w-6" />,
  Flame: <Flame className="h-6 w-6" />,
  Star: <Star className="h-6 w-6" />,
  Zap: <Zap className="h-6 w-6" />,
  Target: <Target className="h-6 w-6" />,
  Eye: <Eye className="h-6 w-6" />,
  Play: <Play className="h-6 w-6" />,
  Calendar: <Calendar className="h-6 w-6" />,
  Repeat: <Repeat className="h-6 w-6" />,
  Medal: <Medal className="h-6 w-6" />,
  Coins: <Coins className="h-6 w-6" />,
  Gem: <Gem className="h-6 w-6" />,
  Crown: <Crown className="h-6 w-6" />,
}

export function BadgesContent() {
  const { user } = useAuth()
  const { data: statsData } = useSWR("/api/stats", fetcher)

  const earnedBadges = new Set(
    statsData?.badges?.map((b: { badge_id: string }) => b.badge_id) || []
  )

  const totalPoints = statsData?.stats?.totalPoints || 0
  const levelInfo = getLevelFromPoints(totalPoints)

  const badgeCategories = [
    {
      name: "Study Time",
      badges: ["FIRST_HOUR", "DEDICATED_LEARNER", "STUDY_MARATHON", "CENTURY"],
    },
    {
      name: "Streaks",
      badges: ["WEEK_WARRIOR", "MONTH_MASTER", "UNSTOPPABLE"],
    },
    {
      name: "Focus",
      badges: ["LASER_FOCUS", "FOCUS_MASTER"],
    },
    {
      name: "Sessions",
      badges: ["FIRST_SESSION", "SESSION_10", "SESSION_50", "SESSION_100"],
    },
    {
      name: "Points",
      badges: ["POINTS_1000", "POINTS_5000", "POINTS_10000"],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Achievements</h1>
        <p className="text-muted-foreground mt-1">
          Track your progress and unlock badges
        </p>
      </div>

      {/* Level Card */}
      <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Level</p>
              <h2 className="text-3xl font-bold text-foreground">
                Level {levelInfo.level}
              </h2>
              <p className="text-primary font-medium">{levelInfo.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-2xl font-bold text-primary">
                {totalPoints.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to next level</span>
              <span className="text-foreground">
                {levelInfo.nextLevel
                  ? `${levelInfo.nextLevel.toLocaleString()} points needed`
                  : "Max level reached!"}
              </span>
            </div>
            <Progress value={levelInfo.progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Level Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle>Level Roadmap</CardTitle>
          <CardDescription>Your journey to Enlightenment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {LEVELS.map((level) => (
              <div
                key={level.level}
                className={`p-3 rounded-lg text-center transition-colors ${
                  levelInfo.level >= level.level
                    ? "bg-primary/20 border border-primary/30"
                    : "bg-secondary/50"
                }`}
              >
                <p
                  className={`text-lg font-bold ${
                    levelInfo.level >= level.level
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {level.level}
                </p>
                <p
                  className={`text-xs ${
                    levelInfo.level >= level.level
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {level.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {level.minPoints.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Badge Categories */}
      {badgeCategories.map((category) => (
        <Card key={category.name}>
          <CardHeader>
            <CardTitle>{category.name} Badges</CardTitle>
            <CardDescription>
              {earnedBadges.size > 0
                ? `${
                    category.badges.filter((b) =>
                      earnedBadges.has(b.toLowerCase())
                    ).length
                  } of ${category.badges.length} unlocked`
                : `${category.badges.length} badges to unlock`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {category.badges.map((badgeId) => {
                const badge = BADGES[badgeId as keyof typeof BADGES]
                const isEarned = earnedBadges.has(badgeId.toLowerCase())

                return (
                  <div
                    key={badgeId}
                    className={`relative p-4 rounded-lg text-center transition-all ${
                      isEarned
                        ? "bg-primary/20 border border-primary/30"
                        : "bg-secondary/50 opacity-60"
                    }`}
                  >
                    <div
                      className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                        isEarned
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isEarned ? (
                        iconMap[badge.icon] || <Award className="h-6 w-6" />
                      ) : (
                        <Lock className="h-6 w-6" />
                      )}
                    </div>
                    <p
                      className={`font-medium text-sm ${
                        isEarned ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {badge.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {badge.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Stats</CardTitle>
          <CardDescription>Progress toward badge requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="p-4 bg-secondary/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">
                {Math.floor((statsData?.stats?.totalStudyMinutes || 0) / 60)}h
              </p>
              <p className="text-xs text-muted-foreground">Total Study Time</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-accent">
                {statsData?.stats?.totalSessions || 0}
              </p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-warning">
                {statsData?.stats?.currentStreak || 0}
              </p>
              <p className="text-xs text-muted-foreground">Current Streak</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-success">
                {Math.round(statsData?.stats?.avgFocusScore || 0)}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Focus</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
