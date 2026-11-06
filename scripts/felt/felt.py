# Renders felt-and-yarn craft sprites (flat-lay, top-down, soft shadow) as transparent PNGs.
# Usage: blender -b -P felt.py -- <outdir> <name|all> [size] [samples]
import bpy, bmesh, math, random, sys
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
WHICH = argv[1] if len(argv) > 1 else 'all'
SIZE = int(argv[2]) if len(argv) > 2 else 640
# The per-piece crop keeps the object near the centre, so small pieces render larger.
SIZE_FOR = {'watch': 1.6, 'travel': 1.6, 'do': 1.3, 'eat': 1.2}
SAMPLES = int(argv[3]) if len(argv) > 3 else 96


def hexrgb(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, a)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        sc.cycles.device = 'GPU'
    except Exception:
        pass
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.resolution_x = SIZE
    sc.render.resolution_y = SIZE
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.45
    world = bpy.data.worlds.new('w')
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.92, 0.95, 1.0, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.3
    return sc


MATS = {}


def felt(hexcol, name=None, fuzz=1.0):
    key = (hexcol, 'felt', fuzz)
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(name or f'felt{hexcol}')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexrgb(hexcol)
    b.inputs['Roughness'].default_value = 1.0
    b.inputs['Sheen Weight'].default_value = 0.9 * fuzz
    b.inputs['Sheen Roughness'].default_value = 0.45
    b.inputs['Sheen Tint'].default_value = (1, 1, 1, 1)
    b.inputs['Specular IOR Level'].default_value = 0.15
    # Fibre bump: fine noise plus stretched streaks.
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n1 = nt.nodes.new('ShaderNodeTexNoise')
    n1.inputs['Scale'].default_value = 180
    n1.inputs['Detail'].default_value = 10
    n1.inputs['Roughness'].default_value = 0.75
    n2 = nt.nodes.new('ShaderNodeTexNoise')
    n2.inputs['Scale'].default_value = 40
    n2.inputs['Detail'].default_value = 4
    mix = nt.nodes.new('ShaderNodeMath')
    mix.operation = 'ADD'
    nt.links.new(tc.outputs['Object'], n1.inputs['Vector'])
    nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
    nt.links.new(n1.outputs['Fac'], mix.inputs[0])
    m2 = nt.nodes.new('ShaderNodeMath')
    m2.operation = 'MULTIPLY'
    m2.inputs[1].default_value = 0.35
    nt.links.new(n2.outputs['Fac'], m2.inputs[0])
    nt.links.new(m2.outputs[0], mix.inputs[1])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.9
    bump.inputs['Distance'].default_value = 0.02
    nt.links.new(mix.outputs[0], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    # Tiny colour mottling so the felt is not a flat fill.
    ramp = nt.nodes.new('ShaderNodeMixRGB')
    ramp.blend_type = 'MULTIPLY'
    ramp.inputs['Fac'].default_value = 0.12
    ramp.inputs['Color1'].default_value = hexrgb(hexcol)
    nt.links.new(n2.outputs['Color'], ramp.inputs['Color2'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    MATS[key] = m
    return m


def thread(hexcol):
    key = (hexcol, 'thread')
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(f'thread{hexcol}')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexrgb(hexcol)
    b.inputs['Roughness'].default_value = 0.55
    b.inputs['Sheen Weight'].default_value = 0.4
    # Twisted-ply look: wave texture along the strand.
    tc = nt.nodes.new('ShaderNodeTexCoord')
    w = nt.nodes.new('ShaderNodeTexWave')
    w.wave_type = 'BANDS'
    w.bands_direction = 'DIAGONAL'
    w.inputs['Scale'].default_value = 60
    w.inputs['Distortion'].default_value = 1.5
    nt.links.new(tc.outputs['Object'], w.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.6
    nt.links.new(w.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    MATS[key] = m
    return m


def plastic(hexcol):
    key = (hexcol, 'plastic')
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(f'pl{hexcol}')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexrgb(hexcol)
    b.inputs['Roughness'].default_value = 0.28
    b.inputs['Coat Weight'].default_value = 0.5
    MATS[key] = m
    return m


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def shape(name, pts, mat, z=0.0, thick=0.035, bevel=0.018, loc=(0, 0), rot=0.0, scale=1.0):
    """A flat felt cut-out from a closed 2D outline, with soft rounded edges."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.extrude = thick
    cu.bevel_depth = bevel
    cu.bevel_resolution = 4
    cu.resolution_u = 2
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for i, (x, y) in enumerate(pts):
        sp.points[i].co = (x, y, 0, 1)
    sp.use_cyclic_u = True
    ob = link(bpy.data.objects.new(name, cu))
    ob.data.materials.append(mat)
    ob.location = (loc[0], loc[1], z + thick + bevel)
    ob.rotation_euler = (random.uniform(-0.025, 0.025), random.uniform(-0.025, 0.025), rot)
    ob.scale = (scale, scale, 1)
    return ob


def petal_pts(L, W, r0=0.0, power=0.7, tip=1.0, n=70, notch=0.0):
    """Petal pointing +Y. power<1 rounds it, tip>1 sharpens the tip."""
    right = []
    for i in range(n + 1):
        s = i / n
        w = (W / 2) * (math.sin(math.pi * s) ** power) * ((1 - s) ** (0.35 * (tip - 1)) if tip > 1 else 1)
        y = r0 + s * L
        if notch and s > 0.85:
            y -= notch * math.cos((s - 0.85) / 0.15 * math.pi / 2) * 0  # reserved
        right.append((w, y))
    left = [(-x, y) for (x, y) in reversed(right[1:-1])]
    return right + left


def circle_pts(r, n=64, wobble=0.0, seed=0):
    rnd = random.Random(seed)
    ph = [rnd.random() * 6.28 for _ in range(3)]
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        rr = r * (1 + wobble * (0.5 * math.sin(3 * t + ph[0]) + 0.3 * math.sin(5 * t + ph[1]) + 0.2 * math.sin(7 * t + ph[2])))
        out.append((rr * math.cos(t), rr * math.sin(t)))
    return out


def rotpts(pts, a, dx=0, dy=0):
    c, s = math.cos(a), math.sin(a)
    return [(x * c - y * s + dx, x * s + y * c + dy) for x, y in pts]


def capsule(p0, p1, r, mat, z):
    """One stitch: a short rounded thread segment lying on the felt."""
    v = Vector((p1[0] - p0[0], p1[1] - p0[1], 0))
    L = v.length
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1)
    ob = bpy.context.active_object
    ob.scale = (L / 2 + r * 0.6, r, r * 0.75)
    ob.rotation_euler = (0, 0, math.atan2(v.y, v.x))
    ob.location = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, z + r * 0.35)
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob


def running_stitch(path, mat, z, r=0.012, stitch=0.075, gap=0.05, closed=False):
    pts = list(path) + ([path[0]] if closed else [])
    # Resample the polyline by arc length.
    seg = []
    total = 0
    for a, b in zip(pts, pts[1:]):
        d = math.dist(a, b)
        seg.append((a, b, total, d))
        total += d

    def at(t):
        for a, b, s0, d in seg:
            if s0 + d >= t:
                k = (t - s0) / d if d else 0
                return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)
        return pts[-1]

    t = gap / 2
    while t + stitch <= total:
        capsule(at(t), at(t + stitch), r, mat, z)
        t += stitch + gap


def knot(x, y, z, r, mat, rnd):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=r)
    ob = bpy.context.active_object
    ob.location = (x, y, z + r * 0.4)
    ob.scale = (1, 1, 0.75)
    ob.rotation_euler = (rnd.random(), rnd.random(), rnd.random())
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob


def button(x, y, z, r, col, thread_col, cross=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=r, depth=r * 0.28, location=(x, y, z + r * 0.14))
    ob = bpy.context.active_object
    ob.data.materials.append(plastic(col))
    bev = ob.modifiers.new('b', 'BEVEL')
    bev.width = r * 0.1
    bev.segments = 4
    bpy.ops.object.shade_smooth()
    # A rim and four holes threaded with a cross.
    bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.78, minor_radius=r * 0.06, location=(x, y, z + r * 0.28))
    rim = bpy.context.active_object
    rim.data.materials.append(plastic(col))
    bpy.ops.object.shade_smooth()
    tm = thread(thread_col)
    h = r * 0.25
    if cross:
        capsule((x - h, y - h), (x + h, y + h), r * 0.075, tm, z + r * 0.28)
        capsule((x - h, y + h), (x + h, y - h), r * 0.075, tm, z + r * 0.28)
    else:
        # Four open holes, no thread.
        for hx, hy in ((-h, -h), (h, -h), (-h, h), (h, h)):
            bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=r * 0.075, depth=r * 0.02, location=(x + hx, y + hy, z + r * 0.285))
            hole = bpy.context.active_object
            hole.data.materials.append(plastic('#2a2110' if col == '#f4c542' else '#4a1a2a'))


def leaf(angle, L, W, col, z, dist=0.25, stitch_col=None):
    pts = petal_pts(L, W, r0=dist, power=0.85, tip=1.6)
    pts = rotpts(pts, angle)
    shape('leaf', pts, felt(col), z=z)
    if stitch_col:
        a = angle
        vein = [(-math.sin(a) * (dist + L * k), math.cos(a) * (dist + L * k)) for k in (0.12, 0.85)]
        running_stitch(vein, thread(stitch_col), z + 0.104, r=0.011, stitch=0.07, gap=0.045)


def cam_light(scale=3.3, tilt=0.0, high=False):
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.ortho_scale = scale
    co = link(bpy.data.objects.new('cam', cam))
    co.location = (0, -tilt * 10, 10)
    co.rotation_euler = (math.atan2(tilt * 10, 10), 0, 0)
    bpy.context.scene.camera = co
    l = bpy.data.lights.new('key', 'AREA')
    l.energy = 420
    l.size = 4.0
    lo = link(bpy.data.objects.new('key', l))
    lo.location = (-3.0, 3.0, 8.0) if high else (-4.5, 4.5, 4.2)
    lo.rotation_euler = (math.radians(-28), math.radians(-24), 0)
    lo.rotation_euler = Vector((0, 0, 0)).to_track_quat('Z', 'Y').to_euler()
    d = Vector((0, 0, 0)) - lo.location
    lo.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    f = bpy.data.lights.new('fill', 'AREA')
    f.energy = 90
    f.size = 6
    fo = link(bpy.data.objects.new('fill', f))
    fo.location = (3, -2, 7)
    d = Vector((0, 0, 0)) - fo.location
    fo.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    pl = bpy.context.active_object
    pl.is_shadow_catcher = True


# ------------------------------------------------------------------------------------------
# The six flowers. Each is a flat-lay felt flower with yarn stitching.
# ------------------------------------------------------------------------------------------
GREEN = '#5f9e6e'
GREEN_T = '#2f5e3b'


def daisy(rnd):  # Connector
    leaf(math.radians(-140), 0.95, 0.42, GREEN, 0, stitch_col=GREEN_T)
    leaf(math.radians(150), 0.8, 0.36, GREEN, 0, stitch_col=GREEN_T)
    n = 12
    for i in range(n):
        a = 2 * math.pi * i / n + rnd.uniform(-0.04, 0.04)
        L = 0.92 * rnd.uniform(0.94, 1.04)
        pts = rotpts(petal_pts(L, 0.36, r0=0.12, power=0.6), a)
        z = 0.06 + (i % 2) * 0.03
        shape('p', pts, felt('#f7b3cb'), z=z)
        mid = [(-math.sin(a) * r, math.cos(a) * r) for r in (0.36, 0.86)]
        running_stitch(mid, thread('#ffffff'), z + 0.104, r=0.012, stitch=0.08, gap=0.05)
    shape('c', circle_pts(0.33, wobble=0.03, seed=2), felt('#f4c542'), z=0.16)
    button(0, 0, 0.24, 0.2, '#fdf6e3', '#e0628f')


def poppy(rnd):  # Creator
    leaf(math.radians(-130), 1.0, 0.44, GREEN, 0, stitch_col=GREEN_T)
    leaf(math.radians(160), 0.85, 0.38, GREEN, 0, stitch_col=GREEN_T)
    for layer, (n, L, W, col, off, z) in enumerate([(5, 1.05, 1.0, '#ee5a3c', 0.0, 0.06), (5, 0.82, 0.82, '#f47a5c', math.pi / 5, 0.14)]):
        for i in range(n):
            a = 2 * math.pi * i / n + off + rnd.uniform(-0.05, 0.05)
            pts = rotpts(petal_pts(L, W, r0=0.0, power=0.45), a)
            shape('p', pts, felt(col), z=z)
            if layer == 0:
                pass
    shape('c', circle_pts(0.3, wobble=0.04, seed=5), felt('#2b2230'), z=0.24)
    km = thread('#1a1420')
    for i in range(14):
        a = 2 * math.pi * i / 14
        knot(0.36 * math.cos(a), 0.36 * math.sin(a), 0.24, 0.045, km, rnd)
    for i in range(7):
        a = 2 * math.pi * i / 7 + 0.3
        knot(0.15 * math.cos(a), 0.15 * math.sin(a), 0.32, 0.04, thread('#5a4a63'), rnd)


def sunflower(rnd):  # Achiever
    leaf(math.radians(-145), 1.0, 0.46, GREEN, 0, dist=0.45, stitch_col=GREEN_T)
    leaf(math.radians(140), 0.9, 0.4, GREEN, 0, dist=0.45, stitch_col=GREEN_T)
    for layer, (n, L, W, col, off, z) in enumerate([(14, 0.72, 0.3, '#f1b51c', 0, 0.05), (14, 0.66, 0.28, '#f8cc3c', math.pi / 14, 0.11)]):
        for i in range(n):
            a = 2 * math.pi * i / n + off + rnd.uniform(-0.03, 0.03)
            pts = rotpts(petal_pts(L * rnd.uniform(0.95, 1.05), W, r0=0.4, power=0.8, tip=1.9), a)
            shape('p', pts, felt(col), z=z)
    shape('c', circle_pts(0.5, wobble=0.02, seed=3), felt('#6b4423'), z=0.18)
    km = thread('#3e2412')
    km2 = thread('#8a5a2b')
    k = 0
    for ring, (r, cnt) in enumerate([(0.4, 22), (0.29, 16), (0.18, 10), (0.07, 4)]):
        for i in range(cnt):
            a = 2 * math.pi * i / cnt + ring * 0.2
            knot(r * math.cos(a), r * math.sin(a), 0.25, 0.045, km if (k % 3) else km2, rnd)
            k += 1


def dandelion(rnd):  # Explorer
    leaf(math.radians(-150), 0.95, 0.34, GREEN, 0, dist=0.3, stitch_col=GREEN_T)
    leaf(math.radians(135), 0.85, 0.3, GREEN, 0, dist=0.3, stitch_col=GREEN_T)
    for layer, (n, L, W, col, z) in enumerate([(30, 0.9, 0.1, '#8cc4e8', 0.05), (26, 0.72, 0.1, '#a9d4f0', 0.1), (20, 0.52, 0.1, '#c7e4f7', 0.15)]):
        for i in range(n):
            a = 2 * math.pi * i / n + layer * 0.07 + rnd.uniform(-0.03, 0.03)
            pts = rotpts(petal_pts(L * rnd.uniform(0.92, 1.05), W, r0=0.1, power=0.55), a)
            shape('p', pts, felt(col), z=z, thick=0.025, bevel=0.012)
    shape('c', circle_pts(0.2, seed=8), felt('#5d97c4'), z=0.2)
    km = thread('#ffffff')
    for i in range(6):
        a = 2 * math.pi * i / 6
        knot(0.1 * math.cos(a), 0.1 * math.sin(a), 0.26, 0.04, km, rnd)
    knot(0, 0, 0.27, 0.04, km, rnd)


def iris(rnd):  # Thinker
    leaf(math.radians(-160), 1.05, 0.3, GREEN, 0, dist=0.3, stitch_col=GREEN_T)
    leaf(math.radians(170), 0.9, 0.26, GREEN, 0, dist=0.3, stitch_col=GREEN_T)
    for i in range(3):
        a = 2 * math.pi * i / 3 + rnd.uniform(-0.04, 0.04)
        pts = rotpts(petal_pts(1.0, 0.78, r0=0.05, power=0.5), a)
        shape('fall', pts, felt('#6f7fe0'), z=0.05)
        beard = [(-math.sin(a) * r, math.cos(a) * r) for r in (0.22, 0.62)]
        running_stitch(beard, thread('#f6c945'), 0.05 + 0.104, r=0.018, stitch=0.06, gap=0.03)
    for i in range(3):
        a = 2 * math.pi * i / 3 + math.pi / 3 + rnd.uniform(-0.04, 0.04)
        pts = rotpts(petal_pts(0.72, 0.46, r0=0.05, power=0.6, tip=1.3), a)
        shape('std', pts, felt('#a7b2f2'), z=0.13)
        mid = [(-math.sin(a) * r, math.cos(a) * r) for r in (0.2, 0.62)]
        running_stitch(mid, thread('#ffffff'), 0.13 + 0.104, r=0.011, stitch=0.065, gap=0.045)
    button(0, 0, 0.21, 0.15, '#3c4bb0', '#ffffff')


def sprig(rnd, a, length, buds):
    ca, sa = math.cos(a), math.sin(a)
    stem = [(-0.03, -1.15), (0.03, -1.15), (0.03, length), (-0.03, length)]
    shape('stem', rotpts(stem, a), felt('#5f9e6e'), z=0.0, thick=0.025, bevel=0.012)
    cols = [felt('#b9a4ef'), felt('#9d86e2'), felt('#c9b8f5')]
    for i in range(buds):
        y = length - 0.62 + i * (0.6 / buds)
        for side in (-1, 1):
            pts = petal_pts(0.13, 0.1, r0=0.0, power=0.55)
            ang = a + side * math.radians(42)
            base = rotpts([(side * 0.02, y)], a)[0]
            shape('bud', rotpts(pts, ang, *base), cols[(i + (side > 0)) % 3], z=0.05 + 0.012 * (i % 2), thick=0.04, bevel=0.025)
    tip = rotpts([(0, length + 0.04)], a)[0]
    knot(tip[0], tip[1], 0.05, 0.055, thread('#9d86e2'), rnd)


def lavender(rnd):  # Chiller: three sprigs tied with yarn
    leaf(math.radians(-150), 0.75, 0.22, GREEN, 0, dist=0.25, stitch_col=GREEN_T)
    leaf(math.radians(150), 0.7, 0.2, GREEN, 0, dist=0.25, stitch_col=GREEN_T)
    for a, L in ((math.radians(24), 1.0), (math.radians(-22), 1.05), (0.0, 1.25)):
        sprig(rnd, a, L, 7)
    tm = thread('#ffffff')
    for dy in (-0.62, -0.55, -0.48):
        capsule((-0.2, dy), (0.2, dy), 0.03, tm, 0.06)
    yarn([(0.0, -0.55, 0.12), (0.25, -0.4, 0.12), (0.36, -0.6, 0.1), (0.12, -0.62, 0.12)], '#ffffff', 0.028, cyclic=True)
    yarn([(0.0, -0.55, 0.12), (-0.25, -0.38, 0.12), (-0.38, -0.6, 0.1), (-0.12, -0.63, 0.12)], '#ffffff', 0.028, cyclic=True)
    yarn([(0.05, -0.58, 0.1), (0.2, -0.85, 0.05), (0.32, -1.05, 0.04)], '#ffffff', 0.026)
    yarn([(-0.05, -0.58, 0.1), (-0.15, -0.88, 0.05), (-0.3, -1.08, 0.04)], '#ffffff', 0.026)


def yarn(points, col, r, cyclic=False):
    """A strand of yarn following a smooth path."""
    cu = bpy.data.curves.new('yarn', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = 4
    cu.resolution_u = 24
    sp = cu.splines.new('NURBS')
    sp.points.add(len(points) - 1)
    for i, (x, y, z) in enumerate(points):
        sp.points[i].co = (x, y, z, 1)
    sp.use_cyclic_u = cyclic
    sp.use_endpoint_u = not cyclic
    sp.order_u = 4 if len(points) >= 4 else len(points)
    ob = link(bpy.data.objects.new('yarn', cu))
    ob.data.materials.append(thread(col))
    return ob


def bud(rnd):  # not bloomed yet: a closed felt bud with two leaves
    stem = [(-0.035, -1.1), (0.035, -1.1), (0.035, 0.2), (-0.035, 0.2)]
    shape('stem', stem, felt('#5f9e6e'), thick=0.025, bevel=0.012)
    for side, y in ((1, -0.6), (-1, -0.35)):
        pts = rotpts(petal_pts(0.6, 0.26, power=0.8, tip=1.5), side * math.radians(-55), 0, y)
        shape('leaf', pts, felt(GREEN), z=0.0)
        a = side * math.radians(-55)
        vein = [(0 - math.sin(a) * r, y + math.cos(a) * r) for r in (0.08, 0.5)]
        running_stitch(vein, thread(GREEN_T), 0.104, r=0.01, stitch=0.06, gap=0.04)
    shape('cup', rotpts(petal_pts(0.5, 0.42, power=0.6), 0, 0, 0.05), felt('#7fb78a'), z=0.04)
    shape('bud', rotpts(petal_pts(0.55, 0.34, power=0.7, tip=1.4), 0, 0, 0.22), felt('#e9e3f7'), z=0.02)
    shape('cup2', rotpts(petal_pts(0.34, 0.5, power=0.5), 0, 0, 0.1), felt('#6fae7b'), z=0.1)


def yarnball(rnd, col='#e86f8f'):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.62, location=(0, 0, 0.62), segments=48, ring_count=24)
    core = bpy.context.active_object
    core.data.materials.append(felt(col))
    bpy.ops.object.shade_smooth()
    for k in range(34):
        ax = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized()
        u = ax.orthogonal().normalized()
        v = ax.cross(u)
        pts = []
        for i in range(16):
            t = 2 * math.pi * i / 16
            p = (u * math.cos(t) + v * math.sin(t)) * 0.655
            pts.append((p.x, p.y, p.z + 0.62))
        yarn(pts, col, 0.03, cyclic=True)
    tail = [(0.42, -0.36, 0.3), (0.66, -0.62, 0.05), (0.9, -0.6, 0.03), (1.05, -0.85, 0.03)]
    yarn(tail, col, 0.03)


def bowl(rnd):  # Eat: a felt bowl of yarn noodles with chopsticks
    shape('rim', circle_pts(1.0, wobble=0.01, seed=1), felt('#f2f4f8'), z=0.0, thick=0.06)
    running_stitch(circle_pts(0.92, n=120), thread('#5d8fd6'), 0.16, r=0.014, stitch=0.08, gap=0.05, closed=True)
    shape('in', circle_pts(0.82, seed=2), felt('#f6e7c8'), z=0.12, thick=0.02)
    for k in range(9):
        pts = []
        a0 = rnd.uniform(0, 6.28)
        for i in range(9):
            t = a0 + i * 0.75
            r = rnd.uniform(0.2, 0.68)
            pts.append((r * math.cos(t), r * math.sin(t), 0.22 + 0.02 * (i % 3)))
        yarn(pts, '#f7d27a', 0.035)
    for x, y in ((-0.35, 0.25), (0.3, 0.32)):
        shape('egg', circle_pts(0.17, seed=int(x * 9)), felt('#ffffff'), z=0.27, thick=0.03)
        shape('yolk', circle_pts(0.08), felt('#f5a623'), z=0.33, thick=0.02)
    shape('leafy', rotpts(petal_pts(0.35, 0.22, power=0.7), 1.0, 0.2, -0.35), felt('#6fae7b'), z=0.27)
    for dx in (0.0, 0.12):
        stick = [(-0.035, -0.95), (0.035, -0.95), (0.025, 0.95), (-0.025, 0.95)]
        shape('chop', rotpts(stick, math.radians(-40), 0.2 + dx, 0.1), felt('#c8925a', fuzz=0.2), z=0.32, thick=0.03)


def kite(rnd):  # Do: a felt kite with a yarn tail and bows
    pts = [(0, 0.95), (0.62, 0.15), (0, -0.85), (-0.62, 0.15)]
    pts = rotpts(pts, math.radians(-18), -0.25, 0.25)
    quads = [
        ([(0, 0.95), (0.62, 0.15), (0, 0.15)], '#f4c542'),
        ([(0.62, 0.15), (0, -0.85), (0, 0.15)], '#e9584d'),
        ([(0, -0.85), (-0.62, 0.15), (0, 0.15)], '#5d8fd6'),
        ([(-0.62, 0.15), (0, 0.95), (0, 0.15)], '#7fbf8e'),
    ]
    for q, c in quads:
        shape('k', rotpts(q, math.radians(-18), -0.25, 0.25), felt(c), z=0.0, thick=0.025, bevel=0.012)
    cx = rotpts([(0, 0.95), (0, -0.85)], math.radians(-18), -0.25, 0.25)
    running_stitch(cx, thread('#ffffff'), 0.074, r=0.012)
    running_stitch(rotpts([(-0.62, 0.15), (0.62, 0.15)], math.radians(-18), -0.25, 0.25), thread('#ffffff'), 0.074, r=0.012)
    tail0 = rotpts([(0, -0.85)], math.radians(-18), -0.25, 0.25)[0]
    tail = [(tail0[0], tail0[1], 0.05), (0.05, -0.9, 0.03), (0.4, -0.75, 0.03), (0.6, -1.1, 0.03), (0.95, -1.0, 0.03), (1.15, -1.3, 0.03)]
    yarn(tail, '#e9584d', 0.025)
    for (x, y), c in (((0.36, -0.82), '#f4c542'), ((0.78, -1.05), '#5d8fd6')):
        for side in (-1, 1):
            b = rotpts(petal_pts(0.16, 0.13, power=0.5), side * math.pi / 2 + 0.3, x, y)
            shape('bow', b, felt(c), z=0.04, thick=0.02, bevel=0.01)
        knot(x, y, 0.06, 0.04, thread(c), rnd)


def popcorn(rnd):  # Watch: a striped felt popcorn tub with pom-pom popcorn
    body = [(-0.62, 0.35), (0.62, 0.35), (0.45, -0.95), (-0.45, -0.95)]
    shape('tub', body, felt('#ffffff'), z=0.0, thick=0.03)
    for i in range(4):
        xa = -0.62 + (i * 2 + 0.5) * 0.155
        xb = -0.45 + (i * 2 + 0.5) * 0.1125
        stripe = [(xa, 0.33), (xa + 0.155, 0.33), (xb + 0.1125, -0.93), (xb, -0.93)]
        shape('st', stripe, felt('#e9584d'), z=0.08, thick=0.01, bevel=0.006)
    shape('band', [(-0.66, 0.42), (0.66, 0.42), (0.64, 0.24), (-0.64, 0.24)], felt('#e9584d'), z=0.09, thick=0.02)
    running_stitch([(-0.6, 0.33), (0.6, 0.33)], thread('#ffffff'), 0.155, r=0.012)
    for i in range(26):
        x = rnd.uniform(-0.6, 0.6)
        y = 0.45 + abs(rnd.gauss(0, 0.18)) * (1 - abs(x) * 0.8)
        r = rnd.uniform(0.09, 0.13)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=r, location=(x, y, 0.12 + r * 0.6))
        ob = bpy.context.active_object
        ob.scale = (1, 1, 0.8)
        ob.data.materials.append(felt('#fbf3dc' if i % 3 else '#f6dc8c'))
        bpy.ops.object.shade_smooth()


def suitcase(rnd):  # Travel: a felt suitcase with a yarn handle and stickers
    def rr(w, h, r, n=10):
        out = []
        for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
            for i in range(n + 1):
                t = math.radians(a0 + 90 * i / n)
                out.append((cx + r * math.cos(t), cy + r * math.sin(t)))
        return out
    shape('case', rr(1.7, 1.2, 0.18), felt('#5d8fd6'), z=0.0, thick=0.05)
    running_stitch(rr(1.52, 1.02, 0.12), thread('#ffffff'), 0.135, r=0.013, closed=True)
    for x in (-0.45, 0.45):
        shape('strap', [(x - 0.07, -0.6), (x + 0.07, -0.6), (x + 0.07, 0.6), (x - 0.07, 0.6)], felt('#2f4f8f'), z=0.1, thick=0.015, bevel=0.008)
    yarn([(-0.28, 0.58, 0.12), (-0.3, 0.85, 0.1), (0.0, 0.98, 0.1), (0.3, 0.85, 0.1), (0.28, 0.58, 0.12)], '#c8925a', 0.05)
    shape('s1', circle_pts(0.2), felt('#f4c542'), z=0.14, thick=0.015, loc=(0.0, 0.12))
    shape('s2', circle_pts(0.14), felt('#e9584d'), z=0.14, thick=0.015, loc=(0.12, -0.25))
    shape('s3', rotpts(petal_pts(0.3, 0.2, power=0.6), 0.5), felt('#ffffff'), z=0.14, thick=0.015, loc=(-0.15, -0.2))


def petal(rnd, col, stitch='#ffffff'):
    """One loose felt petal, pointing up, for the flower you stitch during the quiz."""
    pts = petal_pts(1.9, 0.95, r0=-0.95, power=0.6)
    shape('p', pts, felt(col), z=0.0, thick=0.04, bevel=0.022)
    running_stitch([(0, -0.6), (0, 0.65)], thread(stitch), 0.124, r=0.02, stitch=0.13, gap=0.08)


def centre(rnd):
    """The middle of the quiz flower: a felt disc covered in French knots."""
    shape('c', circle_pts(0.9, wobble=0.02, seed=4), felt('#f4c542'), z=0.0, thick=0.05)
    km = thread('#c98f12')
    for ring, (r, cnt) in enumerate([(0.68, 18), (0.46, 12), (0.24, 7), (0.0, 1)]):
        for i in range(cnt):
            a = 2 * math.pi * i / cnt + ring * 0.3
            knot(r * math.cos(a), r * math.sin(a), 0.14, 0.085, km, rnd)


PETALS = {'explorer': '#8cc4e8', 'creator': '#ee5a3c', 'connector': '#f2a6c0', 'achiever': '#f4c542', 'chiller': '#b8a3ee', 'thinker': '#6f7fe0'}

FLOWERS = {'daisy': daisy, 'poppy': poppy, 'sunflower': sunflower, 'dandelion': dandelion, 'iris': iris, 'lavender': lavender,
           'coin-heads': lambda rnd: button(0, 0, 0, 1.3, '#f4c542', '#8a6410', cross=False),
           'coin-tails': lambda rnd: button(0, 0, 0, 1.3, '#f08aa6', '#8f2f4c', cross=False),
           'bud': bud,
           'centre': centre,
           **{f'petal-{k}': (lambda c: lambda rnd: petal(rnd, c))(v) for k, v in PETALS.items()}, 'yarnball': yarnball, 'eat': bowl, 'do': kite, 'watch': popcorn, 'travel': suitcase}

names = list(FLOWERS) if WHICH == 'all' else WHICH.split(',')
for nm in names:
    sc = reset()
    sc.render.resolution_x = sc.render.resolution_y = int(SIZE * SIZE_FOR.get(nm, 1))
    if nm == 'yarnball':
        # A round object occludes a lot of sky; less ambient keeps its shadow clean.
        sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.12
    MATS.clear()
    rnd = random.Random(7)
    FLOWERS[nm](rnd)
    cam_light(scale={'coin-heads': 3.4, 'coin-tails': 3.4, 'yarnball': 3.3}.get(nm, 3.5), high=nm in ('coin-heads', 'coin-tails', 'yarnball'))
    sc.render.filepath = f'{OUT}/{nm}.png'
    bpy.ops.render.render(write_still=True)
    print('RENDERED', nm)
