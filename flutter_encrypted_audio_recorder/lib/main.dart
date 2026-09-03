import 'dart:io';
import 'package:intl/intl.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:path_provider/path_provider.dart';
import 'audio_recorder_service.dart';
import 'contacts_db_service.dart';
import 'crypto_service.dart';
import 'foreground_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  ForegroundTaskHandler.initForegroundTask();
  runApp(const TransparentEncryptedRecorderApp());
}

class TransparentEncryptedRecorderApp extends StatelessWidget {
  const TransparentEncryptedRecorderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Transparent Encrypted Recorder',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark,
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF0EA5E9),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF1E293B),
          error: Color(0xFFEF4444),
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF1E293B),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF334155), width: 1),
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0F172A),
          elevation: 0,
          scrolledUnderElevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final AudioRecorderService _recorderService = AudioRecorderService();
  final ContactsDatabaseService _dbService = ContactsDatabaseService();
  final CryptoService _cryptoService = CryptoService();
  final AudioPlayer _audioPlayer = AudioPlayer();

  List<File> _encryptedFiles = [];
  List<SavedContact> _savedDbContacts = [];
  bool _isRecording = false;
  bool _showNotification = false;
  bool _keepInBackground = false;
  bool _isPlayingAudio = false;
  String? _currentlyPlayingFileName;
  String _statusText = "Status: Idle";

  final List<SavedContact> _availableContacts = [
    SavedContact(name: "Mom", phone: "+1 555-0192"),
    SavedContact(name: "Boss", phone: "+1 555-0144"),
    SavedContact(name: "Emergency Contact", phone: "+1 555-0188"),
    SavedContact(name: "John Doe", phone: "+1 555-0123"),
    SavedContact(name: "Jane Smith", phone: "+1 555-0156"),
  ];

  @override
  void initState() {
    super.initState();
    _requestPermissions();
    _loadEncryptedFiles();
    _loadSavedContactsFromDb();
    _loadSettingsFromDb();
  }

  Future<void> _requestPermissions() async {
    final statusMic = await Permission.microphone.status;
    final statusContacts = await Permission.contacts.status;
    final statusPhone = await Permission.phone.status;
    final statusManageStorage = await Permission.manageExternalStorage.status;

    if (!statusMic.isGranted ||
        !statusContacts.isGranted ||
        !statusPhone.isGranted ||
        !statusManageStorage.isGranted) {
      if (!mounted) return;

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: const Text(
            'Manage All Access Required',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          content: const Text(
            'To record, encrypt, and manage audio files seamlessly in the background, this app requires complete access permissions (Microphone, Contacts, Phone, Call State, Notifications & Storage Access).',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0EA5E9),
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                Navigator.pop(context);
                await [
                  Permission.microphone,
                  Permission.notification,
                  Permission.contacts,
                  Permission.phone,
                  Permission.manageExternalStorage,
                  Permission.ignoreBatteryOptimizations,
                ].request();

                if (await Permission.manageExternalStorage.isDenied) {
                  await openAppSettings();
                }
              },
              child: const Text('Grant All Access'),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _loadSettingsFromDb() async {
    final bgState = await _dbService.getSetting(ContactsDatabaseService.keyBackgroundEnabled, defaultValue: false);
    final notifState = await _dbService.getSetting(ContactsDatabaseService.keyNotificationEnabled, defaultValue: false);
    setState(() {
      _keepInBackground = bgState;
      _showNotification = notifState;
      if (_keepInBackground) {
        _statusText = "Status: Background Listener Active (Awaiting Whitelisted Call)";
      } else {
        _statusText = "Status: Idle";
      }
    });
  }

  Future<void> _loadEncryptedFiles() async {
    final docsDir = await getApplicationDocumentsDirectory();
    final accessibleRecords = await _dbService.getAccessibleRecordings(docsDir);
    final files = accessibleRecords.map((rec) => File(rec.filePath)).toList();
    setState(() {
      _encryptedFiles = files;
    });
  }

  Future<void> _loadSavedContactsFromDb() async {
    final contacts = await _dbService.getSelectedContacts();
    setState(() {
      _savedDbContacts = contacts;
    });
  }

  Future<void> _toggleRecording() async {
    if (_isRecording) {
      final file = await _recorderService.stopRecordingAndEncrypt();
      if (file != null) {
        final filename = file.path.split(Platform.pathSeparator).last;
        final stat = await file.stat();
        final formattedDate = DateFormat('yyyy-MM-dd HH:mm:ss').format(stat.modified);
        await _dbService.insertRecording(filename, file.path, stat.size, formattedDate);
      }
      setState(() {
        _isRecording = false;
        _statusText = file != null
            ? "Status: Stopped & Saved AES-256 Encrypted File"
            : "Status: Stopped";
      });
      _loadEncryptedFiles();
    } else {
      final micStatus = await Permission.microphone.status;
      if (!micStatus.isGranted) {
        await _requestPermissions();
        return;
      }

      await _recorderService.startRecording(showNotification: _showNotification);
      setState(() {
        _isRecording = true;
        _statusText = _showNotification
            ? "Status: Recording Active (Notification Visible)"
            : "Status: Recording Active (Notification Suppressed)";
      });
    }
  }

  Future<void> _playAudioFile(File file) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final decryptedFile = File('${tempDir.path}/temp_play.m4a');

      final decryptedBytes = await _cryptoService.decryptFile(file);
      await decryptedFile.writeAsBytes(decryptedBytes);

      await _audioPlayer.stop();
      await _audioPlayer.play(DeviceFileSource(decryptedFile.path));

      final basename = file.path.split('/').last;
      final fileSize = (file.lengthSync() / 1024).toStringAsFixed(1);

      setState(() {
        _isPlayingAudio = true;
        _currentlyPlayingFileName = basename;
      });

      if (!mounted) return;

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: const Color(0xFF1E293B),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        builder: (context) {
          Duration duration = Duration.zero;
          Duration position = Duration.zero;
          bool isPlaying = true;
          double currentSpeed = 1.0;
          final speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
          int speedIdx = 0;

          String formatDuration(Duration d) {
            final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
            final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
            return '$minutes:$seconds';
          }

          return StatefulBuilder(
            builder: (context, setModalState) {
              _audioPlayer.onPositionChanged.listen((p) {
                if (context.mounted) {
                  setModalState(() {
                    position = p;
                  });
                }
              });

              _audioPlayer.onDurationChanged.listen((d) {
                if (context.mounted) {
                  setModalState(() {
                    duration = d;
                  });
                }
              });

              _audioPlayer.onPlayerStateChanged.listen((s) {
                if (context.mounted) {
                  setModalState(() {
                    isPlaying = s == PlayerState.playing;
                  });
                }
              });

              return Container(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFF334155),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 16),

                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            basename,
                            style: const TextStyle(
                              fontSize: 14,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0EA5E9),
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF064E3B),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'DECRYPTED',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF34D399)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'AES-256 GCM In-Memory Decryption • $fileSize KB',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                      ),
                    ),
                    const SizedBox(height: 20),

                    Slider(
                      activeColor: const Color(0xFF0EA5E9),
                      inactiveColor: const Color(0xFF334155),
                      value: position.inMilliseconds.toDouble().clamp(
                            0.0,
                            duration.inMilliseconds.toDouble() > 0 ? duration.inMilliseconds.toDouble() : 1.0,
                          ),
                      max: duration.inMilliseconds.toDouble() > 0 ? duration.inMilliseconds.toDouble() : 1.0,
                      onChanged: (val) {
                        _audioPlayer.seek(Duration(milliseconds: val.toInt()));
                      },
                    ),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          formatDuration(position),
                          style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: Color(0xFF94A3B8)),
                        ),
                        Text(
                          formatDuration(duration),
                          style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton.filledTonal(
                          onPressed: () {
                            final newPos = position - const Duration(seconds: 10);
                            _audioPlayer.seek(newPos < Duration.zero ? Duration.zero : newPos);
                          },
                          icon: const Text('-10s', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          style: IconButton.styleFrom(backgroundColor: const Color(0xFF334155)),
                        ),
                        const SizedBox(width: 20),
                        FloatingActionButton(
                          backgroundColor: const Color(0xFF0EA5E9),
                          onPressed: () {
                            if (isPlaying) {
                              _audioPlayer.pause();
                            } else {
                              _audioPlayer.resume();
                            }
                          },
                          child: Icon(isPlaying ? Icons.pause : Icons.play_arrow, color: Colors.white),
                        ),
                        const SizedBox(width: 20),
                        IconButton.filledTonal(
                          onPressed: () {
                            final newPos = position + const Duration(seconds: 10);
                            _audioPlayer.seek(newPos > duration ? duration : newPos);
                          },
                          icon: const Text('+10s', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          style: IconButton.styleFrom(backgroundColor: const Color(0xFF334155)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF334155)),
                            foregroundColor: Colors.white,
                          ),
                          onPressed: () {
                            speedIdx = (speedIdx + 1) % speeds.length;
                            currentSpeed = speeds[speedIdx];
                            _audioPlayer.setPlaybackRate(currentSpeed);
                            setModalState(() {});
                          },
                          child: Text('${currentSpeed}x Speed'),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFEF4444),
                            foregroundColor: Colors.white,
                          ),
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Stop'),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          );
        },
      ).whenComplete(() async {
        await _audioPlayer.stop();
        if (mounted) {
          setState(() {
            _isPlayingAudio = false;
            _currentlyPlayingFileName = null;
          });
        }
        if (decryptedFile.existsSync()) {
          decryptedFile.delete();
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error playing decrypted file: $e')),
        );
      }
    }
  }

  Future<void> _stopAudioPlayback() async {
    await _audioPlayer.stop();
    setState(() {
      _isPlayingAudio = false;
      _currentlyPlayingFileName = null;
    });
  }

  void _openMultiSelectContactDialog() {
    final Set<String> selectedPhones =
        _savedDbContacts.map((c) => c.phone).toSet();
    String searchQuery = "";

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final filteredContacts = _availableContacts.where((c) {
              final query = searchQuery.toLowerCase();
              return c.name.toLowerCase().contains(query) ||
                  c.phone.toLowerCase().contains(query);
            }).toList();

            return AlertDialog(
              backgroundColor: const Color(0xFF1E293B),
              title: const Text('Select Contacts to Save to DB', style: TextStyle(color: Colors.white)),
              content: SizedBox(
                width: double.maxFinite,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        hintText: 'Search contact name or phone...',
                        hintStyle: TextStyle(color: Color(0xFF94A3B8)),
                        prefixIcon: Icon(Icons.search, color: Color(0xFF0EA5E9)),
                        isDense: true,
                        filled: true,
                        fillColor: Color(0xFF0F172A),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(10)),
                          borderSide: BorderSide(color: Color(0xFF334155)),
                        ),
                      ),
                      onChanged: (val) {
                        setDialogState(() {
                          searchQuery = val;
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    Flexible(
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: filteredContacts.length,
                        itemBuilder: (context, index) {
                          final contact = filteredContacts[index];
                          final isChecked = selectedPhones.contains(contact.phone);

                          return CheckboxListTile(
                            activeColor: const Color(0xFF0EA5E9),
                            title: Text(contact.name, style: const TextStyle(color: Colors.white)),
                            subtitle: Text(contact.phone, style: const TextStyle(color: Color(0xFF94A3B8))),
                            value: isChecked,
                            onChanged: (bool? checked) {
                              setDialogState(() {
                                if (checked == true) {
                                  selectedPhones.add(contact.phone);
                                } else {
                                  selectedPhones.remove(contact.phone);
                                }
                              });
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0EA5E9),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () async {
                    final navigator = Navigator.of(context);
                    final messenger = ScaffoldMessenger.of(context);

                    final chosenContacts = _availableContacts
                        .where((c) => selectedPhones.contains(c.phone))
                        .toList();

                    await _dbService.replaceSelectedContacts(chosenContacts);
                    await _loadSavedContactsFromDb();

                    if (mounted) {
                      navigator.pop();
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text('Saved selected contacts to DB table!'),
                        ),
                      );
                    }
                  },
                  child: const Text('Save to DB'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _addCustomUnregisteredNumberDialog() {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: const Text('Add Unregistered / Custom Number', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Contact Label / Name',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                  hintText: 'e.g. Unregistered Contact',
                  hintStyle: TextStyle(color: Color(0xFF64748B)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                  hintText: 'e.g. +1 555-9988',
                  hintStyle: TextStyle(color: Color(0xFF64748B)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0EA5E9),
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                final name = nameController.text.trim().isEmpty
                    ? 'Unregistered Contact'
                    : nameController.text.trim();
                final phone = phoneController.text.trim();

                if (phone.isEmpty) return;

                final messenger = ScaffoldMessenger.of(context);
                final navigator = Navigator.of(context);

                final customContact = SavedContact(name: name, phone: phone);
                setState(() {
                  _availableContacts.add(customContact);
                });

                final currentContacts = await _dbService.getSelectedContacts();
                currentContacts.add(customContact);
                await _dbService.replaceSelectedContacts(currentContacts);
                await _loadSavedContactsFromDb();

                if (mounted) {
                  navigator.pop();
                  messenger.showSnackBar(
                    SnackBar(content: Text('Added custom number $phone to DB table')),
                  );
                }
              },
              child: const Text('Add to DB'),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    _recorderService.dispose();
    super.dispose();
  }

  Future<void> _refreshAllData({bool showSnackBar = true}) async {
    final messenger = ScaffoldMessenger.of(context);
    await _loadSettingsFromDb();
    await _loadSavedContactsFromDb();
    await _loadEncryptedFiles();
    if (mounted && showSnackBar) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Synced DB values, settings & files!'),
          duration: Duration(seconds: 1),
        ),
      );
    }
  }

  void _openExpandedRecordingsModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        String searchQuery = '';
        return StatefulBuilder(
          builder: (context, setModalState) {
            final filteredFiles = _encryptedFiles.where((file) {
              final filename = file.path.split(Platform.pathSeparator).last;
              final modifiedDate = file.existsSync() ? DateFormat('MMM dd, yyyy • hh:mm a').format(file.lastModifiedSync()) : '';
              return filename.toLowerCase().contains(searchQuery.toLowerCase()) || modifiedDate.toLowerCase().contains(searchQuery.toLowerCase());
            }).toList();

            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFF334155),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '🔒 Encrypted Recordings',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Search by filename or date...',
                      hintStyle: const TextStyle(color: Color(0xFF64748B)),
                      prefixIcon: const Icon(Icons.search, color: Color(0xFF0EA5E9)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFF0EA5E9)),
                      ),
                    ),
                    onChanged: (val) {
                      setModalState(() {
                        searchQuery = val;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Showing ${filteredFiles.length} of ${_encryptedFiles.length} recordings',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: filteredFiles.isEmpty
                        ? const Center(
                            child: Text(
                              'No matching encrypted recordings found.',
                              style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                            ),
                          )
                        : ListView.builder(
                            itemCount: filteredFiles.length,
                            itemBuilder: (context, index) {
                              final file = filteredFiles[index];
                              final filename = file.path.split(Platform.pathSeparator).last;
                              final fileSize = (file.lengthSync() / 1024).toStringAsFixed(1);
                              final modifiedDate = file.existsSync() ? DateFormat('MMM dd, yyyy • hh:mm a').format(file.lastModifiedSync()) : '';
                              final isThisPlaying = _isPlayingAudio && _currentlyPlayingFileName == filename;

                              return Card(
                                margin: const EdgeInsets.symmetric(vertical: 4),
                                color: const Color(0xFF1E293B),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: BorderSide(
                                    color: isThisPlaying ? const Color(0xFF0EA5E9) : const Color(0xFF334155),
                                    width: isThisPlaying ? 2 : 1,
                                  ),
                                ),
                                child: ListTile(
                                  leading: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: isThisPlaying ? const Color(0xFF0EA5E9) : const Color(0xFF334155),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(
                                      isThisPlaying ? Icons.volume_up : Icons.lock,
                                      color: isThisPlaying ? Colors.white : const Color(0xFF38BDF8),
                                      size: 20,
                                    ),
                                  ),
                                  title: Text(
                                    filename,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontFamily: 'monospace',
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '📅 $modifiedDate\n$fileSize KB • AES-256 GCM',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: Icon(
                                          isThisPlaying ? Icons.stop_circle : Icons.play_circle_fill,
                                          color: isThisPlaying ? const Color(0xFFEF4444) : const Color(0xFF0EA5E9),
                                          size: 30,
                                        ),
                                        onPressed: () {
                                          if (isThisPlaying) {
                                            _stopAudioPlayback();
                                          } else {
                                            _playAudioFile(file);
                                          }
                                          setModalState(() {});
                                        },
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 22),
                                        onPressed: () async {
                                          if (file.existsSync()) {
                                            await file.delete();
                                            await _loadEncryptedFiles();
                                            setModalState(() {});
                                          }
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF0EA5E9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.shield, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Encrypted Audio Recorder'),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Sync UI & DB',
            icon: const Icon(Icons.sync, color: Color(0xFF0EA5E9)),
            onPressed: () => _refreshAllData(showSnackBar: true),
          ),
          Container(
            margin: const EdgeInsets.only(right: 16, left: 4),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF0EA5E9),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'AES-256 GCM',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFF0EA5E9),
        backgroundColor: const Color(0xFF1E293B),
        onRefresh: () => _refreshAllData(showSnackBar: true),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Banner Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SYSTEM STATUS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF64748B),
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: _isRecording
                                ? const Color(0xFF7F1D1D)
                                : const Color(0xFF064E3B),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _isRecording ? Icons.mic : Icons.mic_none,
                            color: _isRecording
                                ? const Color(0xFFEF4444)
                                : const Color(0xFF10B981),
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _statusText,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: _isRecording
                                  ? const Color(0xFFFCA5A5)
                                  : const Color(0xFF34D399),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Controls & Toggles Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Show Status Notification',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      subtitle: const Text(
                        'Toggles OS foreground service status notification on/off.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                      ),
                      value: _showNotification,
                      activeTrackColor: const Color(0xFF0EA5E9),
                      onChanged: (bool val) async {
                        await _dbService.saveSetting(ContactsDatabaseService.keyNotificationEnabled, val);
                        setState(() {
                          _showNotification = val;
                        });
                      },
                    ),
                    const Divider(color: Color(0xFF334155)),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Keep Running Constantly in Background',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      subtitle: const Text(
                        'Awaits call pickup from DB whitelisted contacts to record.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                      ),
                      value: _keepInBackground,
                      activeTrackColor: const Color(0xFF0EA5E9),
                      onChanged: (bool val) async {
                        await _dbService.saveSetting(ContactsDatabaseService.keyBackgroundEnabled, val);
                        setState(() {
                          _keepInBackground = val;
                          if (_keepInBackground) {
                            _statusText = "Status: Background Listener Active (Awaiting Whitelisted Call)";
                          } else {
                            if (_isRecording) {
                              _toggleRecording();
                            } else {
                              _statusText = "Status: Idle";
                            }
                          }
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: _toggleRecording,
                        icon: Icon(_isRecording ? Icons.stop : Icons.fiber_manual_record),
                        label: Text(
                          _isRecording ? 'Stop & Encrypt' : 'Start Recording',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isRecording
                              ? const Color(0xFFEF4444)
                              : const Color(0xFF0EA5E9),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Contacts Whitelist Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Whitelisted Contacts (DB)',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        Row(
                          children: [
                            FilledButton.tonal(
                              onPressed: _openMultiSelectContactDialog,
                              style: FilledButton.styleFrom(
                                backgroundColor: const Color(0xFF334155),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text('Select', style: TextStyle(fontSize: 12)),
                            ),
                            const SizedBox(width: 4),
                            FilledButton.tonal(
                              onPressed: _addCustomUnregisteredNumberDialog,
                              style: FilledButton.styleFrom(
                                backgroundColor: const Color(0xFF334155),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text('+ Custom', style: TextStyle(fontSize: 12)),
                            ),
                            const SizedBox(width: 4),
                            OutlinedButton(
                              onPressed: () async {
                                final messenger = ScaffoldMessenger.of(context);
                                await _dbService.deleteAllContacts();
                                await _loadSavedContactsFromDb();
                                if (mounted) {
                                  messenger.showSnackBar(
                                    const SnackBar(content: Text('Cleared all contacts from DB table')),
                                  );
                                }
                              },
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                foregroundColor: const Color(0xFFEF4444),
                                side: const BorderSide(color: Color(0xFFEF4444)),
                              ),
                              child: const Text('Clear', style: TextStyle(fontSize: 12)),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: _savedDbContacts.isEmpty
                          ? const Text(
                              'No contacts stored in DB table.',
                              style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                            )
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: _savedDbContacts
                                  .map(
                                    (c) => Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              '• ${c.name} — ${c.phone}',
                                              style: const TextStyle(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w500,
                                                color: Color(0xFFCBD5E1),
                                              ),
                                            ),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline, size: 18, color: Color(0xFFEF4444)),
                                            onPressed: () async {
                                              if (c.id != null) {
                                                final messenger = ScaffoldMessenger.of(context);
                                                await _dbService.deleteContact(c.id!);
                                                await _loadSavedContactsFromDb();
                                                if (mounted) {
                                                  messenger.showSnackBar(
                                                    SnackBar(content: Text('Deleted ${c.name} from DB table')),
                                                  );
                                                }
                                              }
                                            },
                                            constraints: const BoxConstraints(),
                                            padding: EdgeInsets.zero,
                                          ),
                                        ],
                                      ),
                                    ),
                                  )
                                  .toList(),
                            ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Encrypted Recordings Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Encrypted Recordings (.enc)',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                Row(
                  children: [
                    IconButton(
                      tooltip: 'Expand & Search',
                      icon: const Icon(Icons.fullscreen, color: Color(0xFF0EA5E9)),
                      onPressed: _openExpandedRecordingsModal,
                    ),
                    IconButton(
                      tooltip: 'Sync UI & DB',
                      icon: const Icon(Icons.refresh, color: Color(0xFF0EA5E9)),
                      onPressed: () => _refreshAllData(showSnackBar: true),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),

            _encryptedFiles.isEmpty
                ? Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: const Center(
                      child: Text(
                        'No encrypted files (.enc) stored locally.',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                      ),
                    ),
                  )
                : Container(
                    height: 280,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    padding: const EdgeInsets.all(8),
                    child: Scrollbar(
                      thumbVisibility: true,
                      child: ListView.builder(
                        itemCount: _encryptedFiles.length,
                        itemBuilder: (context, index) {
                          final file = _encryptedFiles[index];
                          final filename = file.path.split(Platform.pathSeparator).last;
                          final fileSize = (file.lengthSync() / 1024).toStringAsFixed(1);
                          final isThisPlaying = _isPlayingAudio && _currentlyPlayingFileName == filename;

                          return Card(
                            margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                            color: const Color(0xFF1E293B),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(
                                color: isThisPlaying ? const Color(0xFF0EA5E9) : const Color(0xFF334155),
                                width: isThisPlaying ? 2 : 1,
                              ),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                              leading: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: isThisPlaying
                                      ? const Color(0xFF0EA5E9)
                                      : const Color(0xFF334155),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  isThisPlaying ? Icons.volume_up : Icons.lock,
                                  color: isThisPlaying ? Colors.white : const Color(0xFF38BDF8),
                                  size: 20,
                                ),
                              ),
                              title: Text(
                                filename,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontFamily: 'monospace',
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              subtitle: Text(
                                '$fileSize KB • AES-256 GCM',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: Icon(
                                      isThisPlaying ? Icons.stop_circle : Icons.play_circle_fill,
                                      color: isThisPlaying ? const Color(0xFFEF4444) : const Color(0xFF0EA5E9),
                                      size: 30,
                                    ),
                                    onPressed: () {
                                      if (isThisPlaying) {
                                        _stopAudioPlayback();
                                      } else {
                                        _playAudioFile(file);
                                      }
                                    },
                                  ),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.delete_outline,
                                      color: Color(0xFFEF4444),
                                      size: 22,
                                    ),
                                    onPressed: () {
                                      showDialog(
                                        context: context,
                                        builder: (ctx) => AlertDialog(
                                          backgroundColor: const Color(0xFF1E293B),
                                          title: const Text('Delete Encrypted File', style: TextStyle(color: Colors.white)),
                                          content: Text('Are you sure you want to delete $filename?', style: const TextStyle(color: Color(0xFFCBD5E1))),
                                          actions: [
                                            TextButton(
                                              onPressed: () => Navigator.pop(ctx),
                                              child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
                                            ),
                                            ElevatedButton(
                                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                                              onPressed: () async {
                                                final messenger = ScaffoldMessenger.of(context);
                                                final nav = Navigator.of(ctx);
                                                if (file.existsSync()) {
                                                  await file.delete();
                                                  await _loadEncryptedFiles();
                                                  if (mounted) {
                                                    nav.pop();
                                                    messenger.showSnackBar(
                                                      SnackBar(content: Text('Deleted $filename')),
                                                    );
                                                  }
                                                }
                                              },
                                              child: const Text('Delete', style: TextStyle(color: Colors.white)),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
          ],
        ),
      ),
    ),
    );
  }
}
