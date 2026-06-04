<template>
  <div class="analysis-layout">
    <!-- Backdrop closes any open dropdown -->
    <div v-if="activeDropdown" class="dropdown-backdrop" @click="activeDropdown = null"></div>

    <!-- ── Left: Control Panel ─────────────────────────────────────── -->
    <div class="analysis-controls">
      <!-- Date / Time Range -->
      <div class="ctrl-section">
        <div class="ctrl-row">
          <span class="ctrl-row-lbl">From</span>
          <input type="date" v-model="filters.startDate" class="ctrl-input" />
          <input type="time" v-model="filters.startTime" class="ctrl-input ctrl-input-time" />
        </div>
        <div class="ctrl-row">
          <span class="ctrl-row-lbl">To</span>
          <input type="date" v-model="filters.endDate" class="ctrl-input" />
          <input type="time" v-model="filters.endTime" class="ctrl-input ctrl-input-time" />
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="!filtersReady" class="filters-loading">
        {{ loadingOptions ? 'Loading filters…' : 'Set a date range to load filters.' }}
      </div>

      <template v-if="filtersReady">

      <!-- DEPARTURES -->
      <div class="clf-section clf-dep">
        <div class="clf-header">
          <input type="checkbox" v-model="enabled.dep" class="clf-toggle" />
          <span class="clf-name">Departures</span>
          <span v-if="sectionCounts.dep !== null" class="clf-count">{{ sectionCounts.dep }}</span>
        </div>
        <div class="clf-body" :class="{ 'clf-body--off': !enabled.dep }">
          <div class="clf-row">
            <span class="clf-row-lbl">Aircraft</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('depAc')">
                {{ dropLabel(filters.depAcTypes, options.dep.acTypes, 'Type') }} ▾
              </button>
              <div v-if="activeDropdown === 'depAc'" class="dropdown-menu" @click.stop>
                <template v-if="lfItems(options.dep.acTypes).length">
                  <label class="dropdown-item dropdown-group-header">
                    <input type="checkbox"
                      :checked="lfAllSelected(filters.depAcTypes, options.dep.acTypes)"
                      :indeterminate.prop="lfSomeSelected(filters.depAcTypes, options.dep.acTypes)"
                      @change="filters.depAcTypes = toggleLfGroup(filters.depAcTypes, options.dep.acTypes)" />
                    LF <span class="opt-count">({{ lfCount(options.dep.acTypes) }})</span>
                  </label>
                  <label v-for="t in lfItems(options.dep.acTypes)" :key="t.value"
                    class="dropdown-item dropdown-item-lf" :class="{ 'zero-count': t.count === 0 }">
                    <input type="checkbox" :value="t.value" v-model="filters.depAcTypes" />
                    {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                  </label>
                  <div v-if="otherItems(options.dep.acTypes).length" class="dropdown-separator"></div>
                </template>
                <label v-for="t in otherItems(options.dep.acTypes)" :key="t.value"
                  class="dropdown-item" :class="{ 'zero-count': t.count === 0 }">
                  <input type="checkbox" :value="t.value" v-model="filters.depAcTypes" />
                  {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.depAcTypes = vals(options.dep.acTypes)">All</button>
                  <button @click="filters.depAcTypes = []">None</button>
                </div>
              </div>
            </div>
          </div>
          <div class="clf-row">
            <span class="clf-row-lbl">Runway</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('depRwy')">
                {{ dropLabel(filters.depRunways, options.dep.runways, 'RWY') }} ▾
              </button>
              <div v-if="activeDropdown === 'depRwy'" class="dropdown-menu" @click.stop>
                <label v-for="r in options.dep.runways" :key="r.value" class="dropdown-item" :class="{ 'zero-count': r.count === 0 }">
                  <input type="checkbox" :value="r.value" v-model="filters.depRunways" />
                  {{ r.value }} <span class="opt-count">({{ r.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.depRunways = vals(options.dep.runways)">All</button>
                  <button @click="filters.depRunways = []">None</button>
                </div>
              </div>
            </div>
          </div>
          <div class="clf-row">
            <span class="clf-row-lbl">TMA Exit</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('depSid')">
                {{ dropLabel(filters.depSids, options.dep.sids, 'SID') }} ▾
              </button>
              <div v-if="activeDropdown === 'depSid'" class="dropdown-menu" @click.stop>
                <label v-for="s in options.dep.sids" :key="s.value" class="dropdown-item" :class="{ 'zero-count': s.count === 0 }">
                  <input type="checkbox" :value="s.value" v-model="filters.depSids" />
                  {{ s.value }} <span class="opt-count">({{ s.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.depSids = vals(options.dep.sids)">All</button>
                  <button @click="filters.depSids = []">None</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ARRIVALS -->
      <div class="clf-section clf-arr">
        <div class="clf-header">
          <input type="checkbox" v-model="enabled.arr" class="clf-toggle" />
          <span class="clf-name">Arrivals</span>
          <span v-if="sectionCounts.arr !== null" class="clf-count">{{ sectionCounts.arr }}</span>
        </div>
        <div class="clf-body" :class="{ 'clf-body--off': !enabled.arr }">
          <div class="clf-row">
            <span class="clf-row-lbl">Aircraft</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('arrAc')">
                {{ dropLabel(filters.arrAcTypes, options.arr.acTypes, 'Type') }} ▾
              </button>
              <div v-if="activeDropdown === 'arrAc'" class="dropdown-menu" @click.stop>
                <template v-if="lfItems(options.arr.acTypes).length">
                  <label class="dropdown-item dropdown-group-header">
                    <input type="checkbox"
                      :checked="lfAllSelected(filters.arrAcTypes, options.arr.acTypes)"
                      :indeterminate.prop="lfSomeSelected(filters.arrAcTypes, options.arr.acTypes)"
                      @change="filters.arrAcTypes = toggleLfGroup(filters.arrAcTypes, options.arr.acTypes)" />
                    LF <span class="opt-count">({{ lfCount(options.arr.acTypes) }})</span>
                  </label>
                  <label v-for="t in lfItems(options.arr.acTypes)" :key="t.value"
                    class="dropdown-item dropdown-item-lf" :class="{ 'zero-count': t.count === 0 }">
                    <input type="checkbox" :value="t.value" v-model="filters.arrAcTypes" />
                    {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                  </label>
                  <div v-if="otherItems(options.arr.acTypes).length" class="dropdown-separator"></div>
                </template>
                <label v-for="t in otherItems(options.arr.acTypes)" :key="t.value"
                  class="dropdown-item" :class="{ 'zero-count': t.count === 0 }">
                  <input type="checkbox" :value="t.value" v-model="filters.arrAcTypes" />
                  {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.arrAcTypes = vals(options.arr.acTypes)">All</button>
                  <button @click="filters.arrAcTypes = []">None</button>
                </div>
              </div>
            </div>
          </div>
          <div class="clf-row">
            <span class="clf-row-lbl">Runway</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('arrRwy')">
                {{ dropLabel(filters.arrRunways, options.arr.runways, 'RWY') }} ▾
              </button>
              <div v-if="activeDropdown === 'arrRwy'" class="dropdown-menu" @click.stop>
                <label v-for="r in options.arr.runways" :key="r.value" class="dropdown-item" :class="{ 'zero-count': r.count === 0 }">
                  <input type="checkbox" :value="r.value" v-model="filters.arrRunways" />
                  {{ r.value }} <span class="opt-count">({{ r.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.arrRunways = vals(options.arr.runways)">All</button>
                  <button @click="filters.arrRunways = []">None</button>
                </div>
              </div>
            </div>
          </div>
          <div class="clf-row">
            <span class="clf-row-lbl">TMA Entry</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('arrEntry')">
                {{ dropLabel(filters.arrEntryPoints, options.arr.entryPoints, 'Point') }} ▾
              </button>
              <div v-if="activeDropdown === 'arrEntry'" class="dropdown-menu" @click.stop>
                <label v-for="p in options.arr.entryPoints" :key="p.value" class="dropdown-item" :class="{ 'zero-count': p.count === 0 }">
                  <input type="checkbox" :value="p.value" v-model="filters.arrEntryPoints" />
                  {{ p.value }} <span class="opt-count">({{ p.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.arrEntryPoints = vals(options.arr.entryPoints)">All</button>
                  <button @click="filters.arrEntryPoints = []">None</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CTR FLIGHTS -->
      <div class="clf-section clf-ctr">
        <div class="clf-header">
          <input type="checkbox" v-model="enabled.ctr" class="clf-toggle" />
          <span class="clf-name">CTR Flights</span>
          <span v-if="ctrSectionCount !== null" class="clf-count">{{ ctrSectionCount }}</span>
        </div>
        <div class="clf-body" :class="{ 'clf-body--off': !enabled.ctr }">
          <div class="clf-row">
            <span class="clf-row-lbl">Aircraft</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('ctrAc')">
                {{ dropLabel(filters.ctrAcTypes, options.ctr.acTypes, 'Type') }} ▾
              </button>
              <div v-if="activeDropdown === 'ctrAc'" class="dropdown-menu" @click.stop>
                <template v-if="ctrHeliItems(options.ctr.acTypes).length">
                  <label class="dropdown-item dropdown-group-header">
                    <input type="checkbox"
                      :checked="ctrHeliAllSelected(filters.ctrAcTypes, options.ctr.acTypes)"
                      :indeterminate.prop="ctrHeliSomeSelected(filters.ctrAcTypes, options.ctr.acTypes)"
                      @change="filters.ctrAcTypes = toggleCtrHeliGroup(filters.ctrAcTypes, options.ctr.acTypes)" />
                    Helicopters <span class="opt-count">({{ ctrHeliCount(options.ctr.acTypes) }})</span>
                  </label>
                  <label v-for="t in ctrHeliItems(options.ctr.acTypes)" :key="t.value"
                    class="dropdown-item dropdown-item-lf" :class="{ 'zero-count': t.count === 0 }">
                    <input type="checkbox" :value="t.value" v-model="filters.ctrAcTypes" />
                    {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                  </label>
                  <div v-if="ctrNonHeliItems(options.ctr.acTypes).length" class="dropdown-separator"></div>
                </template>
                <label v-for="t in ctrNonHeliItems(options.ctr.acTypes)" :key="t.value"
                  class="dropdown-item" :class="{ 'zero-count': t.count === 0 }">
                  <input type="checkbox" :value="t.value" v-model="filters.ctrAcTypes" />
                  {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.ctrAcTypes = vals(options.ctr.acTypes)">All</button>
                  <button @click="filters.ctrAcTypes = []">None</button>
                </div>
              </div>
            </div>
          </div>
          <!-- Callsign groups -->
          <div class="ctr-group-row">
            <input type="checkbox" v-model="filters.ctrGroups.pol.show" class="clf-toggle" />
            <span class="ctr-group-label">POL</span>
            <input type="color" v-model="filters.ctrGroups.pol.color" class="ctr-color-swatch" />
          </div>
          <div class="ctr-group-row">
            <input type="checkbox" v-model="filters.ctrGroups.dfl.show" class="clf-toggle" />
            <span class="ctr-group-label">DFL</span>
            <input type="color" v-model="filters.ctrGroups.dfl.color" class="ctr-color-swatch" />
          </div>
          <div class="ctr-group-row">
            <input type="checkbox" v-model="filters.ctrGroups.others.show" class="clf-toggle" />
            <span class="ctr-group-label">Others</span>
            <input type="color" v-model="filters.ctrGroups.others.color" class="ctr-color-swatch" />
          </div>
          <div class="ctr-group-divider"></div>
          <div class="clf-row clf-patria-row">
            <span class="clf-row-lbl">Patria</span>
            <div class="patria-toggle">
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.ctrGroups.patriaFilter === 'all' }]"         @click="filters.ctrGroups.patriaFilter = 'all'">All</button>
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.ctrGroups.patriaFilter === 'patria' }]"       @click="filters.ctrGroups.patriaFilter = 'patria'">Only</button>
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.ctrGroups.patriaFilter === 'non_patria' }]"   @click="filters.ctrGroups.patriaFilter = 'non_patria'">Excl.</button>
            </div>
          </div>
        </div>
      </div>

      <!-- VEHICLES -->
      <div class="clf-section clf-veh">
        <div class="clf-header">
          <input type="checkbox" v-model="enabled.veh" class="clf-toggle" />
          <span class="clf-name">Vehicles</span>
          <span v-if="sectionCounts.veh !== null" class="clf-count">{{ sectionCounts.veh }}</span>
        </div>
        <div class="clf-body" :class="{ 'clf-body--off': !enabled.veh }">
          <div class="clf-row clf-row-check">
            <label class="clf-check">
              <input type="checkbox" v-model="filters.vehFilterBadTracks" />
              Filter bad tracks
            </label>
          </div>
          <div class="clf-row">
            <span class="clf-row-lbl">Callsign</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('vehCs')">
                {{ dropLabel(filters.vehCallsigns, options.veh.callsigns, 'Callsign') }} ▾
              </button>
              <div v-if="activeDropdown === 'vehCs'" class="dropdown-menu dropdown-menu--wide" @click.stop>
                <template v-for="group in VEH_GROUPS" :key="group">
                  <template v-if="vehGroupItems(options.veh.callsigns, group).length">
                    <div class="dropdown-item dropdown-group-header">
                      <input type="checkbox"
                        :checked="vehGroupAllSelected(filters.vehCallsigns, options.veh.callsigns, group)"
                        :indeterminate.prop="vehGroupSomeSelected(filters.vehCallsigns, options.veh.callsigns, group)"
                        @change="filters.vehCallsigns = toggleVehGroup(filters.vehCallsigns, options.veh.callsigns, group)" />
                      <span class="group-collapse-toggle" @click.stop="collapsedVehGroups[group] = !collapsedVehGroups[group]">
                        {{ group }} <span class="opt-count">({{ vehGroupCount(options.veh.callsigns, group) }})</span>
                      </span>
                      <span class="group-chevron" @click.stop="collapsedVehGroups[group] = !collapsedVehGroups[group]">{{ collapsedVehGroups[group] ? '▶' : '▼' }}</span>
                    </div>
                    <template v-if="!collapsedVehGroups[group]">
                      <label v-for="t in vehGroupItems(options.veh.callsigns, group)" :key="t.value"
                        class="dropdown-item dropdown-item-lf" :class="{ 'zero-count': t.count === 0 }">
                        <input type="checkbox" :value="t.value" v-model="filters.vehCallsigns" />
                        {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                      </label>
                    </template>
                  </template>
                </template>
                <template v-if="vehFaltItems(options.veh.callsigns).length">
                  <div class="dropdown-separator"></div>
                  <div class="dropdown-item dropdown-group-header">
                    <input type="checkbox"
                      :checked="vehFaltAllSelected(filters.vehCallsigns, options.veh.callsigns)"
                      :indeterminate.prop="vehFaltSomeSelected(filters.vehCallsigns, options.veh.callsigns)"
                      @change="filters.vehCallsigns = toggleVehFalt(filters.vehCallsigns, options.veh.callsigns)" />
                    <span class="group-collapse-toggle" @click.stop="collapsedVehGroups['__falt__'] = !collapsedVehGroups['__falt__']">
                      FÄLT <span class="opt-count">({{ vehFaltCount(options.veh.callsigns) }})</span>
                    </span>
                    <span class="group-chevron" @click.stop="collapsedVehGroups['__falt__'] = !collapsedVehGroups['__falt__']">{{ collapsedVehGroups['__falt__'] ? '▶' : '▼' }}</span>
                  </div>
                  <template v-if="!collapsedVehGroups['__falt__']">
                    <label v-for="t in vehFaltItems(options.veh.callsigns)" :key="t.value"
                      class="dropdown-item dropdown-item-lf" :class="{ 'zero-count': t.count === 0 }">
                      <input type="checkbox" :value="t.value" v-model="filters.vehCallsigns" />
                      {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                    </label>
                  </template>
                </template>
                <template v-if="vehOthersItems(options.veh.callsigns).length">
                  <div class="dropdown-separator"></div>
                  <div class="dropdown-item dropdown-group-header">
                    <input type="checkbox"
                      :checked="vehOthersAllSelected(filters.vehCallsigns, options.veh.callsigns)"
                      :indeterminate.prop="vehOthersSomeSelected(filters.vehCallsigns, options.veh.callsigns)"
                      @change="filters.vehCallsigns = toggleVehOthers(filters.vehCallsigns, options.veh.callsigns)" />
                    <span class="group-collapse-toggle" @click.stop="collapsedVehGroups['__others__'] = !collapsedVehGroups['__others__']">
                      Others <span class="opt-count">({{ vehOthersCount(options.veh.callsigns) }})</span>
                    </span>
                    <span class="group-chevron" @click.stop="collapsedVehGroups['__others__'] = !collapsedVehGroups['__others__']">{{ collapsedVehGroups['__others__'] ? '▶' : '▼' }}</span>
                  </div>
                  <template v-if="!collapsedVehGroups['__others__']">
                    <label v-for="t in vehOthersItems(options.veh.callsigns)" :key="t.value"
                      class="dropdown-item dropdown-item-lf" :class="{ 'zero-count': t.count === 0 }">
                      <input type="checkbox" :value="t.value" v-model="filters.vehCallsigns" />
                      {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                    </label>
                  </template>
                </template>
                <div class="dropdown-actions">
                  <button @click="filters.vehCallsigns = vals(options.veh.callsigns)">All</button>
                  <button @click="filters.vehCallsigns = []">None</button>
                </div>
              </div>
            </div>
          </div>
          <div class="clf-row clf-patria-row">
            <span class="clf-row-lbl">Runways</span>
            <div class="patria-toggle">
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.vehRunwayFilter === 'all' }]"  @click="filters.vehRunwayFilter = 'all'">All</button>
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.vehRunwayFilter === 'only' }]" @click="filters.vehRunwayFilter = 'only'">Only</button>
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.vehRunwayFilter === 'excl' }]" @click="filters.vehRunwayFilter = 'excl'">Excl.</button>
            </div>
          </div>
          <div class="clf-row clf-patria-row">
            <span class="clf-row-lbl">City Cross.</span>
            <div class="patria-toggle">
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.vehCityFilter === 'all' }]"  @click="filters.vehCityFilter = 'all'">All</button>
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.vehCityFilter === 'only' }]" @click="filters.vehCityFilter = 'only'">Only</button>
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.vehCityFilter === 'excl' }]" @click="filters.vehCityFilter = 'excl'">Excl.</button>
            </div>
          </div>
          <div class="clf-row clf-patria-row">
            <span class="clf-row-lbl">Norra Cross.</span>
            <div class="patria-toggle">
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.vehNorraFilter === 'all' }]"  @click="filters.vehNorraFilter = 'all'">All</button>
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.vehNorraFilter === 'only' }]" @click="filters.vehNorraFilter = 'only'">Only</button>
              <button :class="['ptoggle-btn', { 'ptoggle-btn--active': filters.vehNorraFilter === 'excl' }]" @click="filters.vehNorraFilter = 'excl'">Excl.</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ALL OTHERS -->
      <div class="clf-section clf-other">
        <div class="clf-header">
          <input type="checkbox" v-model="enabled.other" class="clf-toggle" />
          <span class="clf-name">All Others</span>
          <span v-if="sectionCounts.other !== null" class="clf-count">{{ sectionCounts.other }}</span>
        </div>
        <div class="clf-body" :class="{ 'clf-body--off': !enabled.other }">
          <div class="clf-row">
            <span class="clf-row-lbl">Aircraft</span>
            <div class="filter-dropdown">
              <button class="dropdown-btn" @click.stop="toggleDropdown('otherAc')">
                {{ dropLabel(filters.otherAcTypes, options.other.acTypes, 'Type') }} ▾
              </button>
              <div v-if="activeDropdown === 'otherAc'" class="dropdown-menu" @click.stop>
                <label v-for="t in options.other.acTypes" :key="t.value" class="dropdown-item" :class="{ 'zero-count': t.count === 0 }">
                  <input type="checkbox" :value="t.value" v-model="filters.otherAcTypes" />
                  {{ t.value }} <span class="opt-count">({{ t.count }})</span>
                </label>
                <div class="dropdown-actions">
                  <button @click="filters.otherAcTypes = vals(options.other.acTypes)">All</button>
                  <button @click="filters.otherAcTypes = []">None</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      </template>

      <!-- Run -->
      <hr class="ctrl-divider" />
      <!-- Image/Tiles toggle — image mode hidden for now; tiles only
      <div class="map-mode-toggle">
        <button :class="['mode-btn', { 'mode-btn--active': mapMode === 'image' }]" @click="mapMode = 'image'">Image</button>
        <button :class="['mode-btn', { 'mode-btn--active': mapMode === 'tiles' }]" @click="mapMode = 'tiles'">Tiles</button>
      </div>
      -->
      <button class="ctrl-run-btn" :disabled="!filtersReady" @click="runAnalysis">
        CREATE MAP
      </button>

    </div>

    <!-- ── Right: Results Panel ───────────────────────────────────── -->
    <div class="analysis-results">
      <div ref="mapContainer" class="map-container"></div>

      <div v-if="!mapImageData && !creatingMap" class="results-overlay">
        Configure filters and click CREATE MAP.
      </div>
      <div v-if="creatingMap" class="results-overlay results-overlay--loading">
        Rendering {{ totalFlightCount.toLocaleString() }} tracks…
      </div>

      <AirspaceLayerPanel :show-dep-markers="false" @layer-change="onLayerChange" @basemap-change="onBasemapChange" />

      <div v-if="mapImageData" class="map-count-badge">
        {{ mapImageData.count.toLocaleString() }} flights
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import axios from 'axios'
import OlMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import ImageLayer from 'ol/layer/Image'
import XYZ from 'ol/source/XYZ'
import Static from 'ol/source/ImageStatic'
import GeoJSON from 'ol/format/GeoJSON'
import { fromLonLat, transformExtent } from 'ol/proj'
import { Stroke, Style, Fill, Circle as CircleStyle, Text, RegularShape } from 'ol/style'
import AirspaceLayerPanel from './AirspaceLayerPanel.vue'
import { useAirspaceData } from '../composables/useAirspaceData.js'

export default {
  name: 'AnalysisTab',
  components: { AirspaceLayerPanel },
  setup() {
    const activeDropdown = ref(null)
    const toggleDropdown = (key) => {
      activeDropdown.value = activeDropdown.value === key ? null : key
    }

    // ── Map state ──────────────────────────────────────────────────
    const mapContainer = ref(null)
    const creatingMap  = ref(false)
    const mapImageData = ref(null)
    const mapMode      = ref('image')   // 'image' | 'tiles'
    let olMap        = null
    let basemapLayer = null
    let trackLayer   = null
    const airspaceLayers = ref({})
    const { airspaceData, fetchEssaVfrPoints } = useAirspaceData()
    const geoJsonFormat = new GeoJSON()

    // Airspace layer styles (same as FlightsMap)
    const airspaceLayerStyle = new Style({
      stroke: new Stroke({ color: 'rgba(255, 50, 50, 0.8)', width: 1.5, lineDash: [5, 5] }),
      fill:   new Fill({ color: 'rgba(255, 50, 50, 0.02)' }),
    })
    const r16LayerStyle = new Style({
      stroke: new Stroke({ color: 'rgba(255, 140, 0, 0.85)', width: 1.5, lineDash: [8, 4] }),
      fill:   new Fill({ color: 'rgba(255, 140, 0, 0.04)' }),
    })
    const tmaLayerStyle = new Style({
      stroke: new Stroke({ color: 'rgba(100, 180, 255, 0.85)', width: 1.5, lineDash: [10, 5] }),
      fill:   new Fill({ color: 'rgba(100, 180, 255, 0.03)' }),
    })
    const makeProcedureStyleFn = (color) => (feature) => new Style({
      image: new CircleStyle({ radius: 5, fill: new Fill({ color }), stroke: new Stroke({ color: 'rgba(0,0,0,0.6)', width: 1 }) }),
      text:  new Text({ text: feature.get('name') || '', offsetY: -12, font: 'bold 10px sans-serif', fill: new Fill({ color }), stroke: new Stroke({ color: 'rgba(0,0,0,0.8)', width: 2 }) }),
    })
    const sidStyleFn  = makeProcedureStyleFn('rgba(0, 210, 210, 1)')
    const starStyleFn = makeProcedureStyleFn('rgba(255, 170, 0, 1)')
    let currentBasemap = 'lightgrey'

    const makeVfrStyleFn = (basemap) => {
      const color  = basemap === 'black' ? '#ffffff' : '#000000'
      const shadow = basemap === 'black' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'
      return (feature) => {
        const label = feature.get('DESIGNATOR') || feature.get('NAME') || feature.get('name') || ''
        const isEctr = feature.get('_vfrType') === 'ectr'
        const image = isEctr
          ? new RegularShape({ points: 3, radius: 6, angle: 0, fill: new Fill({ color }), stroke: new Stroke({ color: shadow, width: 0.5 }) })
          : new CircleStyle({ radius: 5, fill: new Fill({ color: 'rgba(0,0,0,0)' }), stroke: new Stroke({ color, width: 1.5 }) })
        return new Style({ image, text: new Text({ text: label, offsetY: -13, font: 'bold 10px sans-serif', fill: new Fill({ color }), stroke: new Stroke({ color: shadow, width: 2 }) }) })
      }
    }

    const createBasemapLayer = (type) => {
      if (type === 'none') return null
      const url = type === 'black'
        ? 'https://cartodb-basemaps-{a-d}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
        : 'https://cartodb-basemaps-{a-d}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
      return new TileLayer({ source: new XYZ({ url, attributions: '' }), zIndex: 0 })
    }

    const onBasemapChange = ({ basemap }) => {
      if (!olMap) return
      if (basemapLayer) olMap.removeLayer(basemapLayer)
      basemapLayer = createBasemapLayer(basemap)
      if (basemapLayer) olMap.getLayers().insertAt(0, basemapLayer)
      currentBasemap = basemap
      if (airspaceLayers.value.vfrPoints)
        airspaceLayers.value.vfrPoints.setStyle(makeVfrStyleFn(basemap))
    }

    const _addVectorLayer = (features, style, zIndex) => {
      const source = new VectorSource()
      geoJsonFormat.readFeatures(
        { type: 'FeatureCollection', features },
        { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' }
      ).forEach(f => source.addFeature(f))
      const layer = new VectorLayer({ source, style, zIndex })
      olMap.addLayer(layer)
      return layer
    }

    const onLayerChange = ({ type, airport, zone, data }) => {
      if (!olMap) return

      if (type === 'ctr' && airport === 'essa') {
        if (!airspaceData.value.essaCtr) return
        if (!airspaceLayers.value.essaCTR) {
          airspaceLayers.value.essaCTR = new VectorLayer({ source: new VectorSource(), style: airspaceLayerStyle, zIndex: 5 })
          olMap.addLayer(airspaceLayers.value.essaCTR)
        }
        const visible = data.full ? airspaceData.value.essaCtr.filter(f => f.properties.NAMEOFAREA === 'ARLANDA CTR') : []
        const src = airspaceLayers.value.essaCTR.getSource()
        src.clear()
        if (visible.length) {
          geoJsonFormat.readFeatures({ type: 'FeatureCollection', features: visible }, { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' }).forEach(f => src.addFeature(f))
          airspaceLayers.value.essaCTR.setVisible(true)
        } else {
          airspaceLayers.value.essaCTR.setVisible(false)
        }

      } else if (type === 'tma') {
        if (!airspaceLayers.value.tma)
          airspaceLayers.value.tma = _addVectorLayer(airspaceData.value.tma, tmaLayerStyle, 4)
        airspaceLayers.value.tma.setVisible(data.visible)

      } else if (type === 'r16') {
        if (!airspaceData.value.r16?.length) return
        if (!airspaceLayers.value.r16)
          airspaceLayers.value.r16 = _addVectorLayer(airspaceData.value.r16, r16LayerStyle, 5)
        airspaceLayers.value.r16.setVisible(data.visible)

      } else if (type === 'sid') {
        if (!airspaceLayers.value.sid)
          airspaceLayers.value.sid = _addVectorLayer(airspaceData.value.essaSid, sidStyleFn, 6)
        airspaceLayers.value.sid.setVisible(data.visible)

      } else if (type === 'star') {
        if (!airspaceLayers.value.star)
          airspaceLayers.value.star = _addVectorLayer(airspaceData.value.essaStar, starStyleFn, 6)
        airspaceLayers.value.star.setVisible(data.visible)

      } else if (type === 'vfrPoints') {
        if (data.visible) {
          fetchEssaVfrPoints().then(() => {
            if (!airspaceLayers.value.vfrPoints) {
              airspaceLayers.value.vfrPoints = _addVectorLayer(
                airspaceData.value.essaVfrPoints || [], makeVfrStyleFn(currentBasemap), 7
              )
            }
            airspaceLayers.value.vfrPoints.setVisible(true)
          })
        } else if (airspaceLayers.value.vfrPoints) {
          airspaceLayers.value.vfrPoints.setVisible(false)
        }
      }
      // dep markers not applicable in analysis map — ignored
    }

    const filtersReady   = ref(false)
    const loadingOptions = ref(false)
    const sectionCounts  = ref({ dep: null, arr: null, ctr: null, veh: null, other: null })

    // Per-category option lists: [{ value, count }, ...]
    const options = ref({
      dep:   { acTypes: [], runways: [], sids: [] },
      arr:   { acTypes: [], runways: [], entryPoints: [] },
      ctr:   { acTypes: [] },
      other: { acTypes: [] },
      veh:   { callsigns: [] },
    })

    const enabled = ref({ dep: true, arr: true, ctr: false, veh: false, other: false })

    const filters = ref({
      startDate: '', startTime: '00:00',
      endDate:   '', endTime:   '23:59',
      depAcTypes: [], depRunways: [], depSids: [],
      arrAcTypes: [], arrRunways: [], arrEntryPoints: [],
      ctrAcTypes: [],
      ctrGroups: {
        pol:          { show: true, color: '#00ccff' },
        dfl:          { show: true, color: '#ff8800' },
        others:       { show: true, color: '#cc00ff' },
        patriaFilter: 'all',
      },
      vehFilterBadTracks: true,
      vehCallsigns: [],
      vehRunwayFilter: 'all',
      vehCityFilter:  'all',
      vehNorraFilter: 'all',
      otherAcTypes: [],
    })

    // LF (regional/prop) aircraft type grouping
    const LF_TYPES = new Set(['AT73', 'AT75', 'AT76', 'DH8D', 'DH8C', 'BE20', 'B190', 'F50'])
    const lfItems    = (optList) => optList.filter(o => LF_TYPES.has(o.value))
    const otherItems = (optList) => optList.filter(o => !LF_TYPES.has(o.value))
    const lfAllSelected  = (sel, optList) => { const lf = lfItems(optList); return lf.length > 0 && lf.every(o => sel.includes(o.value)) }
    const lfSomeSelected = (sel, optList) => { const lf = lfItems(optList); return lf.some(o => sel.includes(o.value)) && !lf.every(o => sel.includes(o.value)) }
    const lfCount = (optList) => lfItems(optList).reduce((s, o) => s + o.count, 0)
    function toggleLfGroup(sel, optList) {
      const lfVals = lfItems(optList).map(o => o.value)
      const allSel = lfVals.every(v => sel.includes(v))
      if (allSel) return sel.filter(v => !lfVals.includes(v))
      return [...sel.filter(v => !lfVals.includes(v)), ...lfVals]
    }

    // CTR helicopter grouping (based on is_heli flag from API)
    const ctrHeliItems    = (optList) => optList.filter(o => o.is_heli)
    const ctrNonHeliItems = (optList) => optList.filter(o => !o.is_heli)
    const ctrHeliAllSelected  = (sel, optList) => { const h = ctrHeliItems(optList); return h.length > 0 && h.every(o => sel.includes(o.value)) }
    const ctrHeliSomeSelected = (sel, optList) => { const h = ctrHeliItems(optList); return h.some(o => sel.includes(o.value)) && !h.every(o => sel.includes(o.value)) }
    const ctrHeliCount = (optList) => ctrHeliItems(optList).reduce((s, o) => s + o.count, 0)
    function toggleCtrHeliGroup(sel, optList) {
      const heliVals = ctrHeliItems(optList).map(o => o.value)
      const allSel = heliVals.every(v => sel.includes(v))
      if (allSel) return sel.filter(v => !heliVals.includes(v))
      return [...sel.filter(v => !heliVals.includes(v)), ...heliVals]
    }

    // Vehicle callsign grouping
    const VEH_GROUPS = ['TR', 'AVI', 'MENZ', 'AMA', 'ATOS', 'BRV', 'RMS', 'SWK', 'SWEPORT', 'MAINT']
    const collapsedVehGroups = ref(Object.fromEntries([...VEH_GROUPS, '__falt__', '__others__'].map(g => [g, true])))
    const isNumericCallsign  = (v) => !/[A-Za-z]/.test(v)
    const vehGroupItems    = (optList, prefix) => optList.filter(o => o.value.toUpperCase().startsWith(prefix.toUpperCase()))
    const vehFaltItems     = (optList) => optList.filter(o => isNumericCallsign(o.value))
    const vehOthersItems   = (optList) => optList.filter(o => !isNumericCallsign(o.value) && !VEH_GROUPS.some(g => o.value.toUpperCase().startsWith(g.toUpperCase())))
    const vehGroupCount    = (optList, prefix) => vehGroupItems(optList, prefix).reduce((s, o) => s + o.count, 0)
    const vehFaltCount     = (optList) => vehFaltItems(optList).reduce((s, o) => s + o.count, 0)
    const vehOthersCount   = (optList) => vehOthersItems(optList).reduce((s, o) => s + o.count, 0)
    const vehGroupAllSelected  = (sel, optList, prefix) => { const it = vehGroupItems(optList, prefix); return it.length > 0 && it.every(o => sel.includes(o.value)) }
    const vehGroupSomeSelected = (sel, optList, prefix) => { const it = vehGroupItems(optList, prefix); return it.some(o => sel.includes(o.value)) && !it.every(o => sel.includes(o.value)) }
    const vehFaltAllSelected   = (sel, optList) => { const it = vehFaltItems(optList); return it.length > 0 && it.every(o => sel.includes(o.value)) }
    const vehFaltSomeSelected  = (sel, optList) => { const it = vehFaltItems(optList); return it.some(o => sel.includes(o.value)) && !it.every(o => sel.includes(o.value)) }
    const vehOthersAllSelected  = (sel, optList) => { const it = vehOthersItems(optList); return it.length > 0 && it.every(o => sel.includes(o.value)) }
    const vehOthersSomeSelected = (sel, optList) => { const it = vehOthersItems(optList); return it.some(o => sel.includes(o.value)) && !it.every(o => sel.includes(o.value)) }
    function toggleVehGroup(sel, optList, prefix) {
      const gv = vehGroupItems(optList, prefix).map(o => o.value)
      return gv.every(v => sel.includes(v)) ? sel.filter(v => !gv.includes(v)) : [...sel.filter(v => !gv.includes(v)), ...gv]
    }
    function toggleVehFalt(sel, optList) {
      const fv = vehFaltItems(optList).map(o => o.value)
      return fv.every(v => sel.includes(v)) ? sel.filter(v => !fv.includes(v)) : [...sel.filter(v => !fv.includes(v)), ...fv]
    }
    function toggleVehOthers(sel, optList) {
      const ov = vehOthersItems(optList).map(o => o.value)
      return ov.every(v => sel.includes(v)) ? sel.filter(v => !ov.includes(v)) : [...sel.filter(v => !ov.includes(v)), ...ov]
    }

    // Extract just the values from an options array
    const vals = (optList) => optList.map(o => o.value)

    const dropLabel = (selected, optList, name) => {
      if (!optList.length) return `All ${name}s`
      if (selected.length === 0) return `No ${name}`
      if (selected.length === optList.length) return `All ${name}s`
      return `${selected.length} ${name}s`
    }

    // resetSelections=true on initial load; false on date-range updates (preserve user's choices)
    function applyOptions(data, resetSelections) {
      options.value.dep   = { acTypes: data.dep.ac_types,  runways: data.dep.runways, sids: data.dep.sids }
      options.value.arr   = { acTypes: data.arr.ac_types,  runways: data.arr.runways, entryPoints: data.arr.entry_points }
      options.value.ctr   = { acTypes: data.ctr.ac_types }
      options.value.other = { acTypes: data.other.ac_types }
      options.value.veh   = { callsigns: data.veh?.callsigns ?? [] }

      if (resetSelections) {
        filters.value.depAcTypes     = vals(options.value.dep.acTypes)
        filters.value.depRunways     = vals(options.value.dep.runways).filter(v => v !== 'UNKNOWN')
        filters.value.depSids        = vals(options.value.dep.sids)
        filters.value.arrAcTypes     = vals(options.value.arr.acTypes)
        filters.value.arrRunways     = vals(options.value.arr.runways).filter(v => v !== 'UNKNOWN')
        filters.value.arrEntryPoints = vals(options.value.arr.entryPoints)
        filters.value.ctrAcTypes     = vals(options.value.ctr.acTypes)
        filters.value.otherAcTypes   = vals(options.value.other.acTypes)
        const othersSet = new Set(vehOthersItems(options.value.veh.callsigns).map(o => o.value))
        filters.value.vehCallsigns = vals(options.value.veh.callsigns).filter(v => !othersSet.has(v))
      }
    }

    // Guard: don't trigger re-fetch during the initial mount load
    let initializing = true

    onMounted(async () => {
      // Initialise OpenLayers map
      basemapLayer = createBasemapLayer('lightgrey')
      olMap = new OlMap({
        target: mapContainer.value,
        layers: [basemapLayer],
        view: new View({
          center: fromLonLat([17.93, 59.65]),
          zoom: 8,
        }),
        controls: [],
      })

      loadingOptions.value = true
      try {
        const { data } = await axios.get('/api/analysis/filter-options')

        // Set date pickers to the full dataset range
        filters.value.startDate = data.dataset_range.from_date
        filters.value.startTime = data.dataset_range.from_time
        filters.value.endDate   = data.dataset_range.to_date
        filters.value.endTime   = data.dataset_range.to_time

        applyOptions(data, true)
        filtersReady.value = true
        await fetchCounts()
      } catch (e) {
        console.error('Failed to load filter options', e)
      } finally {
        loadingOptions.value = false
        nextTick(() => { initializing = false })
      }
    })

    onUnmounted(() => {
      if (olMap) { olMap.setTarget(undefined); olMap = null }
    })

    // Re-fetch options when the date/time range changes
    let debounceTimer = null
    watch(
      [() => filters.value.startDate, () => filters.value.startTime,
       () => filters.value.endDate,   () => filters.value.endTime],
      () => {
        if (initializing) return
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(async () => {
          if (!filters.value.startDate || !filters.value.endDate) return
          loadingOptions.value = true
          try {
            const { data } = await axios.get('/api/analysis/filter-options', {
              params: {
                from_dt: `${filters.value.startDate}T${filters.value.startTime}`,
                to_dt:   `${filters.value.endDate}T${filters.value.endTime}`,
              },
            })
            applyOptions(data, false)
          } catch (e) {
            console.error('Failed to refresh filter options', e)
          } finally {
            loadingOptions.value = false
          }
        }, 600)
      },
    )

    const ctrSectionCount = computed(() => sectionCounts.value.ctr ?? null)

    async function fetchCounts() {
      if (!filtersReady.value) return
      const f = filters.value
      const csv = (arr) => arr.join(',')
      try {
        const { data } = await axios.get('/api/analysis/flight-counts', {
          params: {
            from_dt:         `${f.startDate}T${f.startTime}`,
            to_dt:           `${f.endDate}T${f.endTime}`,
            dep_ac:          csv(f.depAcTypes),
            dep_rwy:         csv(f.depRunways),
            dep_sid:         csv(f.depSids),
            arr_ac:          csv(f.arrAcTypes),
            arr_rwy:         csv(f.arrRunways),
            arr_ep:          csv(f.arrEntryPoints),
            ctr_ac:          csv(f.ctrAcTypes),
            ctr_show_pol:    f.ctrGroups.pol.show,
            ctr_show_dfl:    f.ctrGroups.dfl.show,
            ctr_show_others: f.ctrGroups.others.show,
            other_ac:        csv(f.otherAcTypes),
            veh_filter_bad_tracks: f.vehFilterBadTracks,
            veh_cs:          csv(f.vehCallsigns),
            veh_rwy_filter:  f.vehRunwayFilter,
            veh_city_filter: f.vehCityFilter,
            veh_norra_filter: f.vehNorraFilter,
          },
        })
        sectionCounts.value = data
      } catch (e) {
        console.error('Failed to fetch flight counts', e)
      }
    }

    let countDebounce = null
    watch(filters, () => {
      if (initializing) return
      clearTimeout(countDebounce)
      countDebounce = setTimeout(fetchCounts, 400)
    }, { deep: true })

    const totalFlightCount = computed(() => {
      const s = sectionCounts.value
      const e = enabled.value
      return (e.dep   ? (s.dep   ?? 0) : 0)
           + (e.arr   ? (s.arr   ?? 0) : 0)
           + (e.ctr   ? (s.ctr   ?? 0) : 0)
           + (e.veh   ? (s.veh   ?? 0) : 0)
           + (e.other ? (s.other ?? 0) : 0)
    })

    // Image mode — kept for reference, not active
    // function _applyTrackImage(data) {
    //   if (!olMap || !data.image) return
    //   if (trackLayer) { olMap.removeLayer(trackLayer); trackLayer = null }
    //   const b = data.bounds
    //   const extent = transformExtent([b.west, b.south, b.east, b.north], 'EPSG:4326', 'EPSG:3857')
    //   trackLayer = new ImageLayer({
    //     source: new Static({ url: data.image, imageExtent: extent }),
    //     zIndex: 10,
    //   })
    //   olMap.addLayer(trackLayer)
    //   olMap.getView().fit(extent, { padding: [30, 30, 30, 30], duration: 600 })
    // }

    function _buildPayload() {
      const f   = filters.value
      const g   = f.ctrGroups
      const csv = arr => arr.join(',')
      return {
        from_dt:          `${f.startDate}T${f.startTime}`,
        to_dt:            `${f.endDate}T${f.endTime}`,
        dep_ac:           csv(f.depAcTypes),
        dep_rwy:          csv(f.depRunways),
        dep_sid:          csv(f.depSids),
        arr_ac:           csv(f.arrAcTypes),
        arr_rwy:          csv(f.arrRunways),
        arr_ep:           csv(f.arrEntryPoints),
        ctr_ac:           csv(f.ctrAcTypes),
        other_ac:         csv(f.otherAcTypes),
        inc_dep:          enabled.value.dep,
        inc_arr:          enabled.value.arr,
        inc_ctr:          enabled.value.ctr,
        inc_veh:          enabled.value.veh,
        inc_other:        enabled.value.other,
        ctr_show_pol:     g.pol.show,
        ctr_pol_color:    g.pol.color,
        ctr_show_dfl:     g.dfl.show,
        ctr_dfl_color:    g.dfl.color,
        ctr_show_others:  g.others.show,
        ctr_others_color: g.others.color,
        ctr_patria_filter: g.patriaFilter,
        veh_filter_bad_tracks: f.vehFilterBadTracks,
        veh_cs:                csv(f.vehCallsigns),
        veh_rwy_filter:        f.vehRunwayFilter,
        veh_city_filter:       f.vehCityFilter,
        veh_norra_filter:      f.vehNorraFilter,
      }
    }

    function _applyTileLayer(jobId) {
      if (!olMap) return
      if (trackLayer) { olMap.removeLayer(trackLayer); trackLayer = null }
      const base = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      trackLayer = new TileLayer({
        source: new XYZ({
          url: `${base}/api/analysis/tiles/${jobId}/{z}/{x}/{y}.png`,
          crossOrigin: 'anonymous',
          tileSize: 256,
        }),
        zIndex: 10,
        opacity: 0.9,
      })
      olMap.addLayer(trackLayer)
    }

    async function runAnalysis() {
      if (!filtersReady.value) return
      creatingMap.value = true
      try {
        const { data } = await axios.post('/api/analysis/create-map-tiles', _buildPayload())
        if (data.job_id) {
          mapImageData.value = { count: data.count }
          _applyTileLayer(data.job_id)
        }
        // Image mode — kept for reference
        // const { data } = await axios.post('/api/analysis/create-map', _buildPayload())
        // if (data.image) { mapImageData.value = data; _applyTrackImage(data) }
      } catch (e) {
        console.error('create-map failed', e)
      } finally {
        creatingMap.value = false
      }
    }


    return {
      activeDropdown, toggleDropdown,
      options, filtersReady, loadingOptions, sectionCounts,
      enabled, filters,
      vals, dropLabel, runAnalysis,
      lfItems, otherItems, lfAllSelected, lfSomeSelected, lfCount, toggleLfGroup,
      ctrHeliItems, ctrNonHeliItems, ctrHeliAllSelected, ctrHeliSomeSelected, ctrHeliCount, toggleCtrHeliGroup,
      ctrSectionCount,
      VEH_GROUPS, collapsedVehGroups,
      vehGroupItems, vehFaltItems, vehOthersItems,
      vehGroupCount, vehFaltCount, vehOthersCount,
      vehGroupAllSelected, vehGroupSomeSelected,
      vehFaltAllSelected, vehFaltSomeSelected,
      vehOthersAllSelected, vehOthersSomeSelected,
      toggleVehGroup, toggleVehFalt, toggleVehOthers,
      mapContainer, creatingMap, mapImageData, totalFlightCount,
      onLayerChange, onBasemapChange,
    }
  }
}
</script>

<style scoped>
.analysis-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #12121e;
  color: #ccc;
}

/* ── Backdrop ──────────────────────────────────────────────────── */
.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

/* ── Left Control Panel ────────────────────────────────────────── */
.analysis-controls {
  flex: 0 0 270px;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.9rem 0.85rem 1.5rem;
  border-right: 1px solid #2a2a3e;
  overflow-y: auto;
  overflow-x: visible;
  background: #1a1a2e;
}

.ctrl-title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  color: #667eea;
  margin-bottom: 0.75rem;
}

.ctrl-section {
  margin-bottom: 0.85rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid #252538;
}

.ctrl-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #666;
  margin-bottom: 0.4rem;
}

.ctrl-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.3rem;
}

.ctrl-row-lbl {
  font-size: 0.67rem;
  color: #666;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 2.2rem;
}

.ctrl-input {
  background: #22223a;
  border: 1px solid #33334d;
  border-radius: 4px;
  color: #bbb;
  font-size: 0.72rem;
  padding: 0.22rem 0.35rem;
  min-width: 0;
  width: 100px;
}
.ctrl-input:focus { outline: none; border-color: #667eea; color: #eee; }
.ctrl-input-time { width: 82px; }

.ctrl-divider {
  border: none;
  border-top: 1px solid #2a2a3e;
  margin: 0.4rem 0 0.8rem;
}

.map-mode-toggle {
  display: flex;
  gap: 0;
  margin-bottom: 0.4rem;
  border: 1px solid #33334d;
  border-radius: 4px;
  overflow: hidden;
}
.mode-btn {
  flex: 1;
  padding: 0.3rem 0;
  font-size: 0.68rem;
  font-weight: 600;
  background: #22223a;
  border: none;
  color: #666;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.mode-btn:hover { background: #2a2a45; color: #aaa; }
.mode-btn--active { background: #667eea; color: #fff; }

.ctrl-run-btn {
  width: 100%;
  padding: 0.45rem;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.ctrl-run-btn:hover:not(:disabled) { background: #7b8ff5; }
.ctrl-run-btn:disabled { background: #2a2a3e; color: #444; cursor: not-allowed; }

/* ── Loading placeholder ───────────────────────────────────────── */
.filters-loading {
  font-size: 0.68rem;
  color: #444;
  text-align: center;
  padding: 1.2rem 0;
  flex: 1;
}

/* ── Classification Sections ───────────────────────────────────── */
.clf-section {
  border-left: 3px solid transparent;
  margin-bottom: 0.5rem;
  border-radius: 0 4px 4px 0;
  background: #1e1e30;
}

.clf-dep   { border-left-color: #4fc3f7; }
.clf-arr   { border-left-color: #ffb74d; }
.clf-ctr   { border-left-color: #ce93d8; }
.clf-veh   { border-left-color: #81c784; }
.clf-other { border-left-color: #90a4ae; }

.clf-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.5rem 0.3rem;
  cursor: pointer;
}

.clf-toggle {
  accent-color: #667eea;
  cursor: pointer;
  flex-shrink: 0;
}

.clf-name {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #ccc;
}

.clf-count {
  margin-left: auto;
  font-size: 0.68rem;
  font-weight: 700;
  color: #667eea;
  padding-right: 0.1rem;
}

.clf-body {
  padding: 0.1rem 0.5rem 0.4rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: opacity 0.15s;
}

.clf-body--off {
  opacity: 0.3;
  pointer-events: none;
}

.clf-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.clf-row-check { padding: 0.05rem 0; }

.clf-row-lbl {
  font-size: 0.65rem;
  color: #666;
  width: 46px;
  flex-shrink: 0;
}

.clf-check {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: #aaa;
  cursor: pointer;
}
.clf-check input { accent-color: #667eea; cursor: pointer; }

.ctr-group-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.05rem 0;
}

.ctr-group-label {
  font-size: 0.7rem;
  color: #aaa;
  flex: 1;
}

.ctr-color-swatch {
  width: 20px;
  height: 16px;
  border: 1px solid #3a3a5c;
  border-radius: 3px;
  padding: 0;
  cursor: pointer;
  background: none;
}

.ctr-group-divider {
  border-top: 1px solid #2a2a3e;
  margin: 0.25rem 0;
}

.clf-patria-row {
  align-items: center;
  gap: 0.4rem;
}

.patria-toggle {
  display: flex;
  border: 1px solid #33334d;
  border-radius: 4px;
  overflow: hidden;
  flex: 1;
}

.ptoggle-btn {
  flex: 1;
  padding: 0.18rem 0;
  font-size: 0.65rem;
  font-weight: 600;
  background: #22223a;
  border: none;
  border-right: 1px solid #33334d;
  color: #555;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.ptoggle-btn:last-child { border-right: none; }
.ptoggle-btn:hover { background: #2a2a45; color: #aaa; }
.ptoggle-btn--active { background: #667eea; color: #fff; }

.clf-sub {
  padding-left: 1.4rem;
  display: flex;
  gap: 0.8rem;
  transition: opacity 0.15s;
}
.clf-sub-tree {
  flex-direction: column;
  gap: 0.12rem;
}
.clf-check-sub { font-size: 0.68rem; color: #888; }

/* ── Dropdowns ─────────────────────────────────────────────────── */
.filter-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-btn {
  padding: 0.18rem 0.45rem;
  border-radius: 3px;
  border: 1px solid #33334d;
  background: #22223a;
  color: #aaa;
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s;
}
.dropdown-btn:hover { border-color: #667eea; color: #ccc; }

.dropdown-menu {
  position: absolute;
  top: calc(100% + 3px);
  left: 0;
  z-index: 1000;
  background: #22223a;
  border: 1px solid #3a3a5c;
  border-radius: 5px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  min-width: 140px;
  max-height: 200px;
  overflow-y: auto;
  padding: 3px 0;
}
.dropdown-menu--wide {
  min-width: 180px;
  max-height: 280px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.22rem 0.65rem;
  font-size: 0.7rem;
  color: #bbb;
  cursor: pointer;
  white-space: nowrap;
}
.dropdown-item:hover { background: #2a2a45; }
.dropdown-item input { accent-color: #667eea; cursor: pointer; }

.opt-count {
  color: #555;
  font-size: 0.65rem;
  margin-left: auto;
  padding-left: 0.5rem;
}
.dropdown-item.zero-count {
  opacity: 0.4;
}

.dropdown-group-header {
  font-weight: 700;
  font-size: 0.67rem;
  color: #aaa;
  background: #1e1e30;
  padding-top: 0.28rem;
  padding-bottom: 0.28rem;
  letter-spacing: 0.3px;
  cursor: default;
}
.dropdown-group-header:hover { background: #252540; }

.group-collapse-toggle {
  flex: 1;
  cursor: pointer;
}
.group-chevron {
  font-size: 0.55rem;
  color: #666;
  padding-left: 0.3rem;
  cursor: pointer;
  user-select: none;
}
.group-chevron:hover { color: #aaa; }

.dropdown-item-lf {
  padding-left: 1.5rem;
}

.dropdown-separator {
  border-top: 1px solid #2a2a45;
  margin: 2px 0;
}

.dropdown-actions {
  display: flex;
  gap: 0.3rem;
  padding: 0.3rem 0.55rem;
  border-top: 1px solid #2a2a45;
}
.dropdown-actions button {
  flex: 1;
  padding: 0.14rem 0.3rem;
  font-size: 0.63rem;
  border: 1px solid #3a3a5c;
  border-radius: 3px;
  background: #1e1e30;
  cursor: pointer;
  color: #888;
}
.dropdown-actions button:hover { background: #2a2a45; color: #ccc; }

/* ── Right Results Panel ───────────────────────────────────────── */
.analysis-results {
  flex: 1;
  position: relative;
  min-width: 0;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
}

.results-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #444;
  font-size: 0.85rem;
  pointer-events: none;
  z-index: 10;
}

.results-overlay--loading {
  color: #667eea;
  background: rgba(18, 18, 30, 0.6);
  pointer-events: all;
}


.map-count-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 0.2rem 0.55rem;
  background: rgba(26, 26, 46, 0.85);
  border: 1px solid #3a3a5c;
  border-radius: 3px;
  font-size: 0.65rem;
  color: #667eea;
  font-weight: 700;
  z-index: 20;
  pointer-events: none;
}
</style>
