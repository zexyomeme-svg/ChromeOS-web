from __future__ import annotations

import os
import platform
import sys
import time
from dataclasses import dataclass
from typing import Dict, List, Optional

START_TIME = time.time()


@dataclass
class MemoryInfo:
    total_mb: Optional[int]
    free_mb: Optional[int]


def _read_linux_meminfo() -> Dict[str, int]:
    meminfo: Dict[str, int] = {}
    try:
        with open('/proc/meminfo', 'r', encoding='utf-8') as handle:
            for line in handle:
                if ':' not in line:
                    continue
                key, value = line.split(':', 1)
                amount = value.strip().split()[0]
                if amount.isdigit():
                    meminfo[key] = int(amount)
    except OSError:
        return {}
    return meminfo


def get_memory_info() -> MemoryInfo:
    total_mb: Optional[int] = None
    free_mb: Optional[int] = None

    try:
        page_size = os.sysconf('SC_PAGE_SIZE')
        phys_pages = os.sysconf('SC_PHYS_PAGES')
        avail_pages = os.sysconf('SC_AVPHYS_PAGES')
        total_mb = round((page_size * phys_pages) / 1024 / 1024)
        free_mb = round((page_size * avail_pages) / 1024 / 1024)
    except (AttributeError, ValueError, OSError):
        pass

    if total_mb is None or free_mb is None:
        meminfo = _read_linux_meminfo()
        if total_mb is None and 'MemTotal' in meminfo:
            total_mb = round(meminfo['MemTotal'] / 1024)
        if free_mb is None:
            if 'MemAvailable' in meminfo:
                free_mb = round(meminfo['MemAvailable'] / 1024)
            elif 'MemFree' in meminfo:
                free_mb = round(meminfo['MemFree'] / 1024)

    return MemoryInfo(total_mb=total_mb, free_mb=free_mb)


def get_rss_mb() -> Optional[int]:
    try:
        import resource

        usage = resource.getrusage(resource.RUSAGE_SELF)
        rss = usage.ru_maxrss
        if sys.platform == 'darwin':
            return round(rss / 1024 / 1024)
        return round(rss / 1024)
    except Exception:
        return None


def get_load_avg() -> List[float]:
    try:
        return [round(value, 2) for value in os.getloadavg()]
    except (AttributeError, OSError):
        return [0.0, 0.0, 0.0]


def infer_performance_profile(total_mem_mb: Optional[int], cpu_cores: int) -> str:
    if total_mem_mb is None:
        if cpu_cores < 2:
            return 'economy'
        if cpu_cores < 4:
            return 'balanced'
        return 'performance'
    if total_mem_mb < 768 or cpu_cores < 1:
        return 'economy'
    if total_mem_mb < 4096 or cpu_cores < 2:
        return 'balanced'
    return 'performance'


def get_runtime_stats() -> dict:
    memory = get_memory_info()
    cpu_cores = os.cpu_count() or 0
    rss_mb = get_rss_mb()
    uptime_sec = round(time.time() - START_TIME)

    return {
        'environment': 'render' if os.getenv('RENDER') or os.getenv('RENDER_SERVICE_NAME') else 'python',
        'render': {
            'serviceName': os.getenv('RENDER_SERVICE_NAME'),
            'instanceId': os.getenv('RENDER_INSTANCE_ID'),
            'region': os.getenv('RENDER_REGION'),
            'gitCommit': os.getenv('RENDER_GIT_COMMIT'),
            'gitBranch': os.getenv('RENDER_GIT_BRANCH'),
        },
        'host': {
            'hostname': platform.node() or 'python-host',
            'platform': platform.system().lower(),
            'arch': platform.machine().lower(),
            'nodeVersion': f'python {platform.python_version()}',
            'uptimeSec': uptime_sec,
            'cpuCores': cpu_cores,
            'loadAvg': get_load_avg(),
            'totalMemMb': memory.total_mb,
            'freeMemMb': memory.free_mb,
        },
        'process': {
            'rssMb': rss_mb,
            'heapTotalMb': None,
            'heapUsedMb': None,
            'externalMb': None,
            'pid': os.getpid(),
        },
        'performanceProfile': infer_performance_profile(memory.total_mb, cpu_cores),
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }
