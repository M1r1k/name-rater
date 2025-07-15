import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { loadAllData, createRatedName, upsertRating, upsertWeight, deleteRatedName } from './lib/dataService';

interface Dimension {
  key: string;
  name: string;
  weight: number;
}

interface NameRating {
  [key: string]: number | undefined;
}

interface NameRatings {
  dad: NameRating;
  mom: NameRating;
}

interface Name {
  id: number;
  name: string;
  ratings: NameRatings;
  isBlacklisted?: boolean;
}

interface ProcessedName extends Name {
  dadScore: number;
  momScore: number;
  combinedScore: number;
}

interface Weights {
  dad: { [key: string]: number };
  mom: { [key: string]: number };
}

interface ExpandedNames {
  [key: number | string]: boolean;
}

interface SegmentedControlProps {
  value: number | undefined;
  onChange: (value: number) => void;
  options?: number[];
}

interface NameData {
  year: number;
  gender: string;
  rank: number;
  name: string;
  count: number;
  perThousand: number;
}





interface TopNameData {
  name: string;
  gender: string;
  totalCount: number;
  avgCount: number;
}

const DIMENSIONS: Dimension[] = [
  { key: 'personalFeeling', name: 'Personal feeling', weight: 10 },
  { key: 'locality', name: 'Locality of the name', weight: 9 },
  { key: 'internationality', name: 'Internationality of the name', weight: 8 },
  { key: 'transliterations', name: 'Name transliterations (readability)', weight: 7 },
  { key: 'shortVersion', name: 'Short/cute version', weight: 6 },
  { key: 'popularity', name: 'Not too popular', weight: 5 },
  { key: 'ukrainianFriendly', name: 'Ukrainian friendly short version', weight: 4 },
  { key: 'denmarkAttitude', name: 'Attitude in Denmark', weight: 3 },
  { key: 'lastNameSound', name: 'How sounds with last name', weight: 2 },
  { key: 'tragedeigh', name: 'How much of tragedeigh', weight: 1 }
];

const BabyNameRater = () => {
  const [names, setNames] = useState<Name[]>([]);
  const [currentName, setCurrentName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('rate');
  const [expandedNames, setExpandedNames] = useState<ExpandedNames>({});
  const [weights, setWeights] = useState<Weights>({
    dad: Object.fromEntries(DIMENSIONS.map(d => [d.key, d.weight])),
    mom: Object.fromEntries(DIMENSIONS.map(d => [d.key, d.weight]))
  });
  const [selectedParent, setSelectedParent] = useState<'dad' | 'mom'>(() => {
    const saved = localStorage.getItem('selectedParent');
    return (saved as 'dad' | 'mom') || 'dad';
  });

  
  // Statistics state
  const [nameData, setNameData] = useState<NameData[]>([]);
  const [selectedName, setSelectedName] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [globalGenderFilter, setGlobalGenderFilter] = useState<string>('both');
  const [compareNames, setCompareNames] = useState<{ name1: string; name2: string }>({ name1: '', name2: '' });
  const [topNamesData, setTopNamesData] = useState<TopNameData[]>([]);
  const [yearlyStats, setYearlyStats] = useState<any[]>([]);
  const [genderStats, setGenderStats] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedGenderFilter, setSuggestedGenderFilter] = useState<string>('both');
  const [sortBy, setSortBy] = useState<'blacklisted' | 'finished' | 'not-finished'>('not-finished');

  // Load data from Supabase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const { ratedNames, weights, allRatings } = await loadAllData();
        
        // Convert Supabase data to app format
        const namesData = ratedNames.map(ratedName => {
          const nameRatings = allRatings.find(r => r.nameId === ratedName.id)?.ratings || [];
          
          // Convert ratings to the expected format
          const dadRatings: NameRating = {};
          const momRatings: NameRating = {};
          
          nameRatings.forEach(rating => {
            // Separate ratings by parent_id
            if (rating.parent_id === 'dad') {
              dadRatings[rating.dimension_key] = rating.rating;
            } else if (rating.parent_id === 'mom') {
              momRatings[rating.dimension_key] = rating.rating;
            }
          });
          
          return {
            id: ratedName.id,
            name: ratedName.name,
            ratings: {
              dad: dadRatings,
              mom: momRatings
            },
            isBlacklisted: ratedName.is_blacklisted
          };
        });
        
        // Convert weights
        const weightsData: Weights = {
          dad: Object.fromEntries(DIMENSIONS.map(d => [d.key, d.weight])),
          mom: Object.fromEntries(DIMENSIONS.map(d => [d.key, d.weight]))
        };
        
        weights.forEach(weight => {
          weightsData.dad[weight.dimension_key] = weight.weight;
          weightsData.mom[weight.dimension_key] = weight.weight;
        });
        
        setNames(namesData);
        setWeights(weightsData);
        // Expanded names are now only in memory, so we start with empty state
        setExpandedNames({});
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
      }
    };
    
    loadData();
  }, []);

  // Load statistics data
  useEffect(() => {
    const loadStatisticsData = async () => {
      try {
        const response = await fetch('/parsed-names.json');
        const data: NameData[] = await response.json();
        setNameData(data);
        
        // Process data for visualizations
        processStatisticsData(data);
      } catch (error) {
        console.error('Error loading statistics data:', error);
      }
    };
    
    loadStatisticsData();
  }, []);

  // Reprocess statistics data when global gender filter changes
  useEffect(() => {
    if (nameData.length > 0) {
      processStatisticsData(nameData);
    }
  }, [globalGenderFilter]);

  const getFilteredData = (data: NameData[], genderFilter: string): NameData[] => {
    if (genderFilter === 'both') return data;
    return data.filter(item => item.gender === genderFilter);
  };

  const processStatisticsData = (data: NameData[]) => {
    const filteredData = getFilteredData(data, globalGenderFilter);
    
    // Get top names by total count across all years
    const nameTotals = filteredData.reduce((acc, item) => {
      const key = `${item.name}-${item.gender}`;
      if (!acc[key]) {
        acc[key] = { name: item.name, gender: item.gender, totalCount: 0, years: 0 };
      }
      acc[key].totalCount += item.count;
      acc[key].years += 1;
      return acc;
    }, {} as Record<string, any>);

    const topNames = Object.values(nameTotals)
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 20)
      .map((item: any) => ({
        name: item.name,
        gender: item.gender,
        totalCount: item.totalCount,
        avgCount: Math.round(item.totalCount / item.years)
      }));

    setTopNamesData(topNames);



    // Yearly statistics
    const yearlyData = filteredData.reduce((acc, item) => {
      if (!acc[item.year]) {
        acc[item.year] = { year: item.year, male: 0, female: 0, total: 0 };
      }
      acc[item.year][item.gender] += item.count;
      acc[item.year].total += item.count;
      return acc;
    }, {} as Record<number, any>);

    setYearlyStats(Object.values(yearlyData).sort((a, b) => a.year - b.year));

    // Gender statistics
    const genderData = filteredData.reduce((acc, item) => {
      if (!acc[item.gender]) {
        acc[item.gender] = { gender: item.gender, totalCount: 0, uniqueNames: new Set() };
      }
      acc[item.gender].totalCount += item.count;
      acc[item.gender].uniqueNames.add(item.name);
      return acc;
    }, {} as Record<string, any>);

    setGenderStats(Object.values(genderData).map(item => ({
      gender: item.gender,
      totalCount: item.totalCount,
      uniqueNames: item.uniqueNames.size
    })));
  };

  // Note: We'll save data to Supabase in the individual functions instead of using useEffect
  // This prevents excessive API calls and gives us more control over when to save

  const calculateWeightedScore = (ratings: NameRating, parentWeights: { [key: string]: number }): number => {
    const validRatings = Object.entries(ratings).filter(([, value]) => value !== undefined);
    if (validRatings.length === 0) return 0;
    
    const totalWeight = validRatings.reduce((sum, [key]) => sum + (parentWeights[key] || 0), 0);
    const weightedSum = validRatings.reduce((sum, [key, value]) => {
      return sum + ((value as number) * (parentWeights[key] || 0));
    }, 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const addName = async () => {
    if (currentName.trim()) {
      try {
        const ratedName = await createRatedName(currentName.trim(), false);
        if (ratedName) {
          const newName: Name = {
            id: ratedName.id,
            name: ratedName.name,
            ratings: {
              dad: Object.fromEntries(DIMENSIONS.map(d => [d.key, undefined])),
              mom: Object.fromEntries(DIMENSIONS.map(d => [d.key, undefined]))
            },
            isBlacklisted: false
          };
          setNames([...names, newName]);
          setCurrentName('');
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Error adding name:', error);
      }
    }
  };

  const addToBlacklist = async () => {
    if (currentName.trim()) {
      try {
        const ratedName = await createRatedName(currentName.trim(), true);
        if (ratedName) {
          const blacklistedName: Name = {
            id: ratedName.id,
            name: ratedName.name,
            ratings: {
              dad: {},
              mom: {}
            },
            isBlacklisted: true
          };
          setNames([...names, blacklistedName]);
          setCurrentName('');
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Error adding blacklisted name:', error);
      }
    }
  };

  const selectSuggestedName = (nameData: TopNameData) => {
    setCurrentName(nameData.name);
    setShowSuggestions(false);
  };

  const getFilteredSuggestions = () => {
    const genderFilteredData = getSuggestedNamesByGender();
    
    // Filter out names that are already in the rating list
    const existingNames = new Set(names.map(name => name.name.toLowerCase()));
    const filteredData = genderFilteredData.filter(nameData => 
      !existingNames.has(nameData.name.toLowerCase())
    );
    
    // Then filter by search text if provided
    if (!currentName.trim()) return filteredData;
    return filteredData
      .filter(nameData => nameData.name.toLowerCase().includes(currentName.toLowerCase()));
  };

  const getSuggestedNamesByGender = () => {
    const allNamesData = Object.values(nameData.reduce((acc, item) => {
      const key = `${item.name}-${item.gender}`;
      if (!acc[key]) {
        acc[key] = { name: item.name, gender: item.gender, totalCount: 0, years: 0 };
      }
      acc[key].totalCount += item.count;
      acc[key].years += 1;
      return acc;
    }, {} as Record<string, any>))
    .sort((a, b) => b.totalCount - a.totalCount)
    .map((item: any) => ({
      name: item.name,
      gender: item.gender,
      totalCount: item.totalCount,
      avgCount: Math.round(item.totalCount / item.years)
    }));

    if (suggestedGenderFilter === 'both') {
      return allNamesData.slice(0, 50);
    }
    return allNamesData
      .filter(nameData => nameData.gender === suggestedGenderFilter)
      .slice(0, 50);
  };

  const updateRating = async (nameId: number, parent: 'dad' | 'mom', dimension: string, value: number) => {
    try {
      // Save to Supabase
      await upsertRating(nameId, dimension, parent, value);
      
      // Update local state
      setNames(names.map(name => 
        name.id === nameId 
          ? {
              ...name,
              ratings: {
                ...name.ratings,
                [parent]: {
                  ...name.ratings[parent],
                  [dimension]: value
                }
              }
            }
          : name
      ));
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  const toggleNameExpansion = (nameId: number) => {
    setExpandedNames(prev => ({
      ...prev,
      [nameId]: !prev[nameId]
    }));
  };

  const removeName = async (nameId: number) => {
    try {
      // Delete from Supabase
      await deleteRatedName(nameId);
      
      // Update local state
      setNames(names.filter(name => name.id !== nameId));
      // Remove from expanded names (memory only)
      setExpandedNames(prev => {
        const newExpanded = { ...prev };
        delete newExpanded[nameId];
        return newExpanded;
      });
    } catch (error) {
      console.error('Error removing name:', error);
    }
  };

  const isNameComplete = (name: Name, parent: 'dad' | 'mom'): boolean => {
    return DIMENSIONS.every(dimension => name.ratings[parent][dimension.key] !== undefined);
  };

  const hasIncompleteRatings = (name: Name): boolean => {
    return !isNameComplete(name, 'dad') || !isNameComplete(name, 'mom');
  };

  const isBlacklisted = (name: Name): boolean => {
    return name.isBlacklisted === true;
  };

  const isFinished = (name: Name): boolean => {
    return isNameComplete(name, 'dad') && isNameComplete(name, 'mom');
  };

  const getNameStatus = (name: Name): 'blacklisted' | 'finished' | 'not-finished' => {
    if (isBlacklisted(name)) return 'blacklisted';
    if (isFinished(name)) return 'finished';
    return 'not-finished';
  };

  const SegmentedControl: React.FC<SegmentedControlProps> = ({ value, onChange, options = [0, 1, 2, 3] }) => {
    return (
      <div className="inline-flex border border-gray-300 rounded-lg overflow-hidden">
        {options.map(option => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              value === option
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    );
  };

  const updateWeight = async (parent: 'dad' | 'mom', dimension: string, value: string) => {
    try {
      const weightValue = parseInt(value);
      
      // Save to Supabase
      await upsertWeight(dimension, weightValue);
      
      // Update local state
      setWeights({
        ...weights,
        [parent]: {
          ...weights[parent],
          [dimension]: weightValue
        }
      });
    } catch (error) {
      console.error('Error updating weight:', error);
    }
  };

  const getProcessedNames = (): ProcessedName[] => {
    const processedNames = names.map(name => ({
      ...name,
      dadScore: calculateWeightedScore(name.ratings.dad, weights.dad),
      momScore: calculateWeightedScore(name.ratings.mom, weights.mom),
      combinedScore: (
        calculateWeightedScore(name.ratings.dad, weights.dad) +
        calculateWeightedScore(name.ratings.mom, weights.mom)
      ) / 2
    }));

    // Sort by selected status first, then by combined score
    return processedNames.sort((a, b) => {
      const statusA = getNameStatus(a);
      const statusB = getNameStatus(b);
      
      // If sorting by a specific status, prioritize that status
      if (sortBy === 'blacklisted') {
        if (statusA === 'blacklisted' && statusB !== 'blacklisted') return -1;
        if (statusA !== 'blacklisted' && statusB === 'blacklisted') return 1;
      } else if (sortBy === 'finished') {
        if (statusA === 'finished' && statusB !== 'finished') return -1;
        if (statusA !== 'finished' && statusB === 'finished') return 1;
      } else if (sortBy === 'not-finished') {
        if (statusA === 'not-finished' && statusB !== 'not-finished') return -1;
        if (statusA !== 'not-finished' && statusB === 'not-finished') return 1;
      }
      
      // If same status or no specific sort, sort by combined score (descending)
      return b.combinedScore - a.combinedScore;
    });
  };

  const exportData = () => {
    const data = { names, weights, expandedNames };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baby-names-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.names) setNames(data.names);
          if (data.weights) setWeights(data.weights);
          if (data.expandedNames) setExpandedNames(data.expandedNames);
        } catch (error) {
          alert('Error importing data: Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const processedNames = getProcessedNames();
  const topNames = processedNames.slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Baby Name Rating App</h1>
          <p className="text-gray-600">Rate names on multiple dimensions and find your perfect choice</p>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('rate')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'rate' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Rate Names
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'results' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              📊 Results
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'compare' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              👥 Compare
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'settings' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'statistics' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              📊 Statistics
            </button>
            <button
              onClick={exportData}
              className="px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600"
            >
              📥 Export
            </button>
            <label className="px-4 py-2 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 cursor-pointer">
              📤 Import
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </header>

        {activeTab === 'rate' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Add New Name</h2>
              
              {/* Suggested Names Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-700">💡 Popular Names from Statistics</h3>
                  <div className="flex items-center gap-4">
                    {/* Gender Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Gender:</span>
                      <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setSuggestedGenderFilter('both')}
                          className={`px-3 py-1 text-xs font-medium transition-colors ${
                            suggestedGenderFilter === 'both' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          👥 Both
                        </button>
                        <button
                          onClick={() => setSuggestedGenderFilter('male')}
                          className={`px-3 py-1 text-xs font-medium transition-colors ${
                            suggestedGenderFilter === 'male' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          👦 Boys
                        </button>
                        <button
                          onClick={() => setSuggestedGenderFilter('female')}
                          className={`px-3 py-1 text-xs font-medium transition-colors ${
                            suggestedGenderFilter === 'female' 
                              ? 'bg-pink-500 text-white' 
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          👧 Girls
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {showSuggestions ? 'Hide' : 'Show'} Suggestions
                    </button>
                  </div>
                </div>
                
                {showSuggestions && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">
                      Showing {getFilteredSuggestions().length} suggestions for {suggestedGenderFilter === 'both' ? 'all genders' : suggestedGenderFilter === 'male' ? 'boys' : 'girls'}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4 max-h-96 overflow-y-auto">
                      {getFilteredSuggestions().map((nameData, index) => (
                        <button
                          key={index}
                          onClick={() => selectSuggestedName(nameData)}
                          className="px-3 py-2 text-sm bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-lg transition-colors border border-gray-200 hover:border-blue-300"
                          title={`${nameData.name} (${nameData.totalCount.toLocaleString()} total births, ${nameData.gender})`}
                        >
                          <div className="font-medium">{nameData.name}</div>
                          <div className="text-xs text-gray-500">{nameData.totalCount.toLocaleString()}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Name Input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={currentName}
                    onChange={(e) => setCurrentName(e.target.value)}
                    placeholder="Enter custom name or select from suggestions above..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addName()}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  {currentName && (
                    <button
                      onClick={() => setCurrentName('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={addName}
                  disabled={!currentName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  ➕ Add
                </button>
                <button
                  onClick={addToBlacklist}
                  disabled={!currentName.trim()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  ⚫ Blacklist
                </button>
              </div>
              
              {currentName.trim() && (
                <div className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">Ready to add:</span> "{currentName.trim()}"
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Rate Names</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedParent('dad');
                      localStorage.setItem('selectedParent', 'dad');
                    }}
                    className={`px-3 py-1 rounded ${
                      selectedParent === 'dad' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    Artem
                  </button>
                  <button
                    onClick={() => {
                      setSelectedParent('mom');
                      localStorage.setItem('selectedParent', 'mom');
                    }}
                    className={`px-3 py-1 rounded ${
                      selectedParent === 'mom' ? 'bg-pink-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    Kate
                  </button>
                </div>
              </div>

              {/* Sorting Controls */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortBy('not-finished')}
                      className={`px-3 py-1 text-sm rounded ${
                        sortBy === 'not-finished' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300'
                      }`}
                    >
                      ⏳ Not Finished ({names.filter(n => getNameStatus(n) === 'not-finished').length})
                    </button>
                    <button
                      onClick={() => setSortBy('finished')}
                      className={`px-3 py-1 text-sm rounded ${
                        sortBy === 'finished' ? 'bg-green-500 text-white' : 'bg-white border border-gray-300'
                      }`}
                    >
                      ✅ Finished ({names.filter(n => getNameStatus(n) === 'finished').length})
                    </button>
                    <button
                      onClick={() => setSortBy('blacklisted')}
                      className={`px-3 py-1 text-sm rounded ${
                        sortBy === 'blacklisted' ? 'bg-red-500 text-white' : 'bg-white border border-gray-300'
                      }`}
                    >
                      ⚫ Blacklisted ({names.filter(n => getNameStatus(n) === 'blacklisted').length})
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {processedNames.map(name => {
                  const isBlacklistedName = isBlacklisted(name);
                  return (
                    <div key={name.id} className={`border border-gray-200 rounded-lg ${isBlacklistedName ? 'bg-red-50' : ''}`}>
                      <div 
                        className={`p-4 flex items-center justify-between ${!isBlacklistedName ? 'hover:bg-gray-50' : ''}`}
                      >
                        <div 
                          className={`flex items-center gap-3 flex-1 ${!isBlacklistedName ? 'cursor-pointer' : ''}`}
                          onClick={() => !isBlacklistedName && toggleNameExpansion(name.id)}
                        >
                          <h3 className="text-lg font-semibold">{name.name}</h3>
                          {isBlacklistedName && (
                            <span className="text-red-600" title="Blacklisted name">
                              ⚫
                            </span>
                          )}
                          {hasIncompleteRatings(name) && !isBlacklistedName && (
                            <span className="text-amber-500" title="Not all dimensions rated">
                              ⚠️
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isBlacklistedName && (
                            <span className="text-sm text-gray-500">
                              {isNameComplete(name, selectedParent) ? '✅' : '⏳'}
                            </span>
                          )}
                          {!isBlacklistedName && (
                            <button
                              onClick={() => toggleNameExpansion(name.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {expandedNames[name.id] ? '▼' : '▶'}
                            </button>
                          )}
                          <button
                            onClick={() => removeName(name.id)}
                            className="text-red-500 hover:text-red-700 ml-2"
                            title="Remove name"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      {expandedNames[name.id] && !isBlacklistedName && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {DIMENSIONS.map(dimension => (
                              <div key={dimension.key} className="flex items-center justify-between">
                                <label className="text-sm text-gray-700 flex-1">
                                  {dimension.name}
                                </label>
                                <SegmentedControl
                                  value={name.ratings[selectedParent][dimension.key]}
                                  onChange={(value) => updateRating(name.id, selectedParent, dimension.key, value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Top Names</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-center py-2">Status</th>
                      <th className="text-center py-2">Artem</th>
                      <th className="text-center py-2">Kate</th>
                      <th className="text-center py-2">Combined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedNames.map((name) => (
                      <tr key={name.id} className={
                        isBlacklisted(name) ? 'bg-red-50' : 
                        isFinished(name) ? 'bg-green-50' :
                        'bg-yellow-50'
                      }>
                        <td className="py-2 font-medium">
                          {name.name}
                        </td>
                        <td className="text-center py-2">
                          {isBlacklisted(name) && <span className="text-red-600" title="Blacklisted">⚫</span>}
                          {isFinished(name) && !isBlacklisted(name) && <span className="text-green-600" title="Finished">✅</span>}
                          {!isFinished(name) && !isBlacklisted(name) && <span className="text-yellow-600" title="Not Finished">⏳</span>}
                        </td>
                        <td className="text-center py-2">{name.dadScore.toFixed(2)}</td>
                        <td className="text-center py-2">{name.momScore.toFixed(2)}</td>
                        <td className="text-center py-2 font-semibold">{name.combinedScore.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Score Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topNames}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 3]} />
                  <Tooltip />
                  <Bar dataKey="dadScore" fill="#3b82f6" name="Artem" />
                  <Bar dataKey="momScore" fill="#ec4899" name="Kate" />
                  <Bar dataKey="combinedScore" fill="#10b981" name="Combined" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="space-y-6">
            {/* Description Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Parent Comparison</h2>
                <button
                  onClick={() => setExpandedNames(prev => ({ ...prev, compareDescription: !prev.compareDescription }))}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                  {expandedNames.compareDescription ? 'Hide' : 'Show'} Description
                  <span className="text-xs">{expandedNames.compareDescription ? '▼' : '▶'}</span>
                </button>
              </div>
              
              {expandedNames.compareDescription && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">📊 Understanding the Comparison Chart</h3>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>
                      This scatter plot helps you visualize how you and your partner rate the same names:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>X-axis (Artem):</strong> Your ratings (0-3 scale)</li>
                      <li><strong>Y-axis (Kate):</strong> Your partner's ratings (0-3 scale)</li>
                      <li><strong>Each point:</strong> Represents a name you've both rated</li>
                    </ul>
                    <div className="mt-3 p-3 bg-white rounded border border-blue-300">
                      <h4 className="font-medium text-blue-900 mb-2">💡 What to look for:</h4>
                      <ul className="text-xs space-y-1">
                        <li><span className="font-medium">Top-right area:</span> Names you both love (high scores)</li>
                        <li><span className="font-medium">Bottom-left area:</span> Names you both dislike (low scores)</li>
                        <li><span className="font-medium">Diagonal line:</span> Names you agree on (similar ratings)</li>
                        <li><span className="font-medium">Far from diagonal:</span> Names you disagree on (needs discussion)</li>
                        <li><span className="font-medium">Hover over points:</span> See the exact name and scores</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={processedNames}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="dadScore" 
                    domain={[0, 3]} 
                    name="Artem"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="momScore" 
                    domain={[0, 3]} 
                    name="Kate"
                  />
                  <Tooltip 
                    formatter={(value, name) => [typeof value === 'number' ? value.toFixed(2) : value, name]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                  />
                  <Scatter dataKey="momScore" fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Weight Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4 text-blue-600">Artem's Weights</h3>
                  <div className="space-y-3">
                    {DIMENSIONS.map(dimension => (
                      <div key={dimension.key} className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 flex-1">
                          {dimension.name}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={weights.dad[dimension.key]}
                            onChange={(e) => updateWeight('dad', dimension.key, e.target.value)}
                            className="w-20"
                          />
                          <span className="w-8 text-center text-sm font-medium">
                            {weights.dad[dimension.key]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4 text-pink-600">Kate's Weights</h3>
                  <div className="space-y-3">
                    {DIMENSIONS.map(dimension => (
                      <div key={dimension.key} className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 flex-1">
                          {dimension.name}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={weights.mom[dimension.key]}
                            onChange={(e) => updateWeight('mom', dimension.key, e.target.value)}
                            className="w-20"
                          />
                          <span className="w-8 text-center text-sm font-medium">
                            {weights.mom[dimension.key]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="space-y-6">
            {/* Global Gender Filter */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Global Gender Filter</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setGlobalGenderFilter('both')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    globalGenderFilter === 'both' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  👥 Both
                </button>
                <button
                  onClick={() => setGlobalGenderFilter('male')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    globalGenderFilter === 'male' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  👦 Boys
                </button>
                <button
                  onClick={() => setGlobalGenderFilter('female')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    globalGenderFilter === 'female' 
                      ? 'bg-pink-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  👧 Girls
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Currently showing: {globalGenderFilter === 'both' ? 'All genders' : globalGenderFilter === 'male' ? 'Boys only' : 'Girls only'}
              </p>
            </div>

            {/* Overview Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-2">Total Names</h3>
                <p className="text-3xl font-bold text-blue-600">{getFilteredData(nameData, globalGenderFilter).length.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Data points (2015-2024)</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-2">Years Covered</h3>
                <p className="text-3xl font-bold text-green-600">10</p>
                <p className="text-sm text-gray-500">2015-2024</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-2">Unique Names</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {new Set(getFilteredData(nameData, globalGenderFilter).map(item => `${item.name}-${item.gender}`)).size.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Across all years</p>
              </div>
            </div>

            {/* Yearly Trends */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Birth Trends by Year</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="male" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Male" />
                  <Area type="monotone" dataKey="female" stackId="1" stroke="#ec4899" fill="#ec4899" name="Female" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gender Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Gender Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genderStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ gender, totalCount }) => `${gender}: ${totalCount.toLocaleString()}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalCount"
                    >
                      {genderStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.gender === 'male' ? '#3b82f6' : '#ec4899'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Top Names by Total Count</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {topNamesData.slice(0, 10).map((name, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{index + 1}.</span>
                        <span className="font-semibold">{name.name}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          name.gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {name.gender}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">{name.totalCount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Name Search and Analysis */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Name Analysis</h2>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Name</label>
                  <input
                    type="text"
                    value={selectedName}
                    onChange={(e) => setSelectedName(e.target.value)}
                    placeholder="Enter a name to analyze..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender Filter</label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {selectedName && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Trend for "{selectedName}"</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getFilteredData(nameData, globalGenderFilter)
                      .filter(item => 
                        item.name.toLowerCase().includes(selectedName.toLowerCase()) &&
                        (selectedGender === 'all' || item.gender === selectedGender)
                      )
                      .sort((a, b) => a.year - b.year)
                    }>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#8884d8" name="Count" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Name Comparison */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Compare Names</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name 1</label>
                  <input
                    type="text"
                    value={compareNames.name1}
                    onChange={(e) => setCompareNames(prev => ({ ...prev, name1: e.target.value }))}
                    placeholder="Enter first name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name 2</label>
                  <input
                    type="text"
                    value={compareNames.name2}
                    onChange={(e) => setCompareNames(prev => ({ ...prev, name2: e.target.value }))}
                    placeholder="Enter second name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {compareNames.name1 && compareNames.name2 && (() => {
                // Create combined data with both names
                const combinedData = getFilteredData(nameData, globalGenderFilter)
                  .filter(item => 
                    item.name.toLowerCase().includes(compareNames.name1.toLowerCase()) ||
                    item.name.toLowerCase().includes(compareNames.name2.toLowerCase())
                  )
                  .reduce((acc, item) => {
                    const year = item.year;
                    const existing = acc.find(d => d.year === year);
                    
                    if (existing) {
                      if (item.name.toLowerCase().includes(compareNames.name1.toLowerCase())) {
                        existing.name1Count = item.count;
                      }
                      if (item.name.toLowerCase().includes(compareNames.name2.toLowerCase())) {
                        existing.name2Count = item.count;
                      }
                    } else {
                      acc.push({
                        year,
                        name1Count: item.name.toLowerCase().includes(compareNames.name1.toLowerCase()) ? item.count : 0,
                        name2Count: item.name.toLowerCase().includes(compareNames.name2.toLowerCase()) ? item.count : 0
                      });
                    }
                    return acc;
                  }, [] as any[])
                  .sort((a, b) => a.year - b.year);

                return (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Comparison: {compareNames.name1} vs {compareNames.name2}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={combinedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="name1Count" 
                          stroke="#3b82f6" 
                          name={compareNames.name1}
                          strokeDasharray="5 5"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="name2Count" 
                          stroke="#ec4899" 
                          name={compareNames.name2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BabyNameRater;