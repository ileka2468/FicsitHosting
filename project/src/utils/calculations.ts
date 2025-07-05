import { ServerConfig, PerformanceMetrics, CostBreakdown } from '../types';

export const calculatePerformanceMetrics = (config: ServerConfig): PerformanceMetrics => {
  const warnings: string[] = [];
  
  // Improved server score calculation based on server size tiers and optimal player counts
  let serverScore: number;
  
  // Define optimal ranges for each tier
  const tierOptimalRanges = {
    starter: { minPlayers: 1, maxPlayers: 4 },     // 4GB RAM, 2 cores
    standard: { minPlayers: 4, maxPlayers: 10 },   // 6GB RAM, 3 cores  
    premium: { minPlayers: 8, maxPlayers: 20 },    // 8GB RAM, 4 cores
    enterprise: { minPlayers: 16, maxPlayers: 40 }, // 16GB RAM, 6 cores
    ultimate: { minPlayers: 32, maxPlayers: 100 }  // 32GB RAM, 8 cores
  };
  
  const optimalRange = tierOptimalRanges[config.serverSize];
  
  if (config.maxPlayers >= optimalRange.minPlayers && config.maxPlayers <= optimalRange.maxPlayers) {
    // Within optimal range - score based on tier quality
    const tierScores = {
      starter: 85,
      standard: 90,
      premium: 95,
      enterprise: 98,
      ultimate: 100
    };
    serverScore = tierScores[config.serverSize];
  } else if (config.maxPlayers < optimalRange.minPlayers) {
    // Under-utilized - keep high score but add warning
    const tierScores = {
      starter: 85,
      standard: 90,
      premium: 95,
      enterprise: 98,
      ultimate: 100
    };
    serverScore = tierScores[config.serverSize]; // Keep high score since performance is still excellent
  } else {
    // Over capacity - performance degradation
    const overCapacity = config.maxPlayers - optimalRange.maxPlayers;
    serverScore = Math.max(40, 85 - overCapacity * 5);
  }
  
  // Fine-tune based on resource ratios (minor adjustments)
  const ramPerPlayer = config.ram / config.maxPlayers;
  const cpuPerPlayer = config.cpu / config.maxPlayers;
  
  // Ideal ratios: ~0.5GB RAM per player, ~0.15 CPU cores per player
  const ramEfficiency = Math.min(1.2, ramPerPlayer / 0.5);
  const cpuEfficiency = Math.min(1.2, cpuPerPlayer / 0.15);
  
  // Apply efficiency bonuses/penalties (max ±5 points)
  const efficiencyBonus = Math.round((ramEfficiency + cpuEfficiency - 2) * 2.5);
  serverScore = Math.min(100, Math.max(30, serverScore + efficiencyBonus));
  
  // Calculate expected TPS (target is 60)
  const expectedTPS = Math.max(20, Math.min(60, serverScore * 0.6));
  
  // Calculate resource usage
  const memoryUsage = Math.min(90, (config.maxPlayers * 0.5 / config.ram) * 100);
  const cpuUsage = Math.min(90, (config.maxPlayers * 0.15 / config.cpu) * 100);
  
  // Network latency based on location (simulated)
  const latencyMap = {
    'us-east': 45,
    'us-west': 65,
    'eu-west': 85,
    'asia-pacific': 120
  };
  const networkLatency = latencyMap[config.serverLocation];
  
  // Generate warnings
  if (config.ram < config.maxPlayers * 0.4) {
    warnings.push('RAM may be insufficient for smooth gameplay');
  }
  if (config.cpu < config.maxPlayers * 0.12) {
    warnings.push('CPU cores may cause performance bottlenecks');
  }
  if (config.storage < 20) {
    warnings.push('Storage space may be insufficient for world saves');
  }
  if (config.maxPlayers > optimalRange.maxPlayers) {
    warnings.push(`${config.serverSize} tier is optimized for up to ${optimalRange.maxPlayers} players`);
  }
  
  // Add over-provisioning warning for cost optimization
  if (config.maxPlayers < optimalRange.minPlayers) {
    const suggestedTier = config.maxPlayers <= 4 ? 'starter' : 
                         config.maxPlayers <= 10 ? 'standard' : 'premium';
    warnings.push(`💡 Consider ${suggestedTier} tier for ${config.maxPlayers} players - same performance at lower cost`);
  }
  
  return {
    serverScore: Math.round(serverScore),
    expectedTPS,
    memoryUsage,
    cpuUsage,
    networkLatency,
    warnings
  };
};

export const calculateCost = (config: ServerConfig): number => {
  // Pricing based on server size tiers
  const sizePricing = {
    starter: 8,   // Starter: 4GB RAM, optimized CPU allocation
    standard: 15, // Standard: 6GB RAM, balanced performance
    premium: 25,  // Premium: 8GB RAM, high performance
    enterprise: 35, // Enterprise: 16GB RAM, maximum performance
    ultimate: 60  // Ultimate: 32GB RAM, enterprise-grade performance
  };
  
  let baseCost = sizePricing[config.serverSize] || sizePricing.standard;
  
  // Additional storage cost beyond included amount
  const includedStorage = {
    starter: 40,
    standard: 80,
    premium: 120,
    enterprise: 160,
    ultimate: 200
  };
  
  const storageCost = Math.max(0, (config.storage - (includedStorage[config.serverSize] || 80)) * 0.05);
  
  // Backup frequency cost
  const backupCost = config.backupFrequency === 'hourly' ? 2 : 
                    config.backupFrequency === 'daily' ? 0 : 0; // Daily included
  
  return Math.round((baseCost + storageCost + backupCost) * 100) / 100;
};

export const getCostBreakdown = (config: ServerConfig): CostBreakdown => {
  const sizePricing = {
    starter: 8,
    standard: 15,
    premium: 25,
    enterprise: 35,
    ultimate: 60
  };
  
  const includedStorage = {
    starter: 40,
    standard: 80,
    premium: 120,
    enterprise: 160,
    ultimate: 200
  };
  
  const baseSystemCost = sizePricing[config.serverSize] || sizePricing.standard;
  const storage = Math.max(0, (config.storage - (includedStorage[config.serverSize] || 80)) * 0.05);
  const backup = config.backupFrequency === 'hourly' ? 2 : 0;
  
  // For display purposes, we'll show the breakdown differently
  const ram = Math.round(baseSystemCost * 0.6 * 100) / 100; // ~60% for RAM
  const cpu = Math.round(baseSystemCost * 0.4 * 100) / 100; // ~40% for CPU
  
  return {
    ram,
    cpu,
    storage,
    backup,
    total: Math.round((baseSystemCost + storage + backup) * 100) / 100
  };
};

export const getTierDisplayName = (serverSize: string): string => {
  const tierNames = {
    starter: 'Starter',
    standard: 'Standard', 
    premium: 'Premium',
    enterprise: 'Enterprise',
    ultimate: 'Ultimate'
  };
  
  return tierNames[serverSize as keyof typeof tierNames] || 'Unknown';
};