import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_encrypted_audio_recorder/main.dart';

void main() {
  testWidgets('App basic smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const TransparentEncryptedRecorderApp());
    expect(find.text('Transparent Encrypted Audio Recorder'), findsOneWidget);
  });
}
