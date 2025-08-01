const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all projects
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Project.countDocuments(query);

    res.json({
      projects,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas pobierania projektów' });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas pobierania projektu' });
  }
});

// Create new project
router.post('/', [
  auth,
  body('name').trim().isLength({ min: 3 }),
  body('clientName').trim().isLength({ min: 2 }),
  body('clientContact').trim().isLength({ min: 2 }),
  body('clientEmail').isEmail(),
  body('description').trim().isLength({ min: 3 }),
  body('mainBenefit').trim().isLength({ min: 3 }),
  body('projectManager.name').trim().isLength({ min: 2 }),
  body('projectManager.email').isEmail(),
  body('projectManager.phone').trim().isLength({ min: 6 }),
  body('pricing.total').isNumeric().toFloat()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane projektu',
        errors: errors.array() 
      });
    }

    const projectData = {
      ...req.body,
      createdBy: req.user._id
    };

    const project = new Project(projectData);
    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      message: 'Projekt został utworzony pomyślnie',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas tworzenia projektu' });
  }
});

// Update project
router.put('/:id', [
  auth,
  body('name').trim().isLength({ min: 3 }),
  body('clientName').trim().isLength({ min: 2 }),
  body('clientContact').trim().isLength({ min: 2 }),
  body('clientEmail').isEmail(),
  body('description').trim().isLength({ min: 3 }),
  body('mainBenefit').trim().isLength({ min: 3 }),
  body('projectManager.name').trim().isLength({ min: 2 }),
  body('projectManager.email').isEmail(),
  body('projectManager.phone').trim().isLength({ min: 6 }),
  body('pricing.total').isNumeric().toFloat()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane projektu',
        errors: errors.array() 
      });
    }

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony' });
    }

    // Sprawdź uprawnienia (tylko twórca lub admin może edytować)
    if (project.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do edycji tego projektu' });
    }

    Object.assign(project, req.body);
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('createdBy', 'firstName lastName email');

    res.json({
      message: 'Projekt został zaktualizowany pomyślnie',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas aktualizacji projektu' });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony' });
    }

    // Sprawdź uprawnienia (tylko twórca lub admin może usunąć)
    if (project.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do usunięcia tego projektu' });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Projekt został usunięty pomyślnie' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas usuwania projektu' });
  }
});

// Get project statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Project.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$pricing.total' }
        }
      }
    ]);

    const totalProjects = await Project.countDocuments();
    const totalValue = await Project.aggregate([
      { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]);

    res.json({
      stats,
      totalProjects,
      totalValue: totalValue[0]?.total || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas pobierania statystyk' });
  }
});

module.exports = router; 